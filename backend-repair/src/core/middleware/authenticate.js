const AppError = require("../../shared/errors/AppError");
const prisma = require("../database/prisma");
const { verifyAccessToken } = require("../../shared/utils/jwt");
const { AUTH_ERRORS } = require("../../modules/auth/constants");
const { STARTER_TRIAL_DEVICE_LIMIT, isSubscriptionActive } = require("../../shared/utils/subscription");

const canBypassSubscriptionGuard = (req, role) => {
  const path = req.originalUrl || req.url || "";
  const commonBypass =
    path.includes("/auth/me") ||
    path.includes("/auth/logout") ||
    path.includes("/auth/change-password") ||
    path.includes("/subscription");

  if (commonBypass) return true;

  return (
    role === "OWNER" &&
    (path.includes("/branches") ||
      path.includes("/business/profile") ||
      path.includes("/staff") ||
      path.includes("/analytics"))
  );
};

const authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next(
      new AppError("Authentication required", 401, {
        code: AUTH_ERRORS.UNAUTHORIZED,
      })
    );
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    const payload = verifyAccessToken(token);

    if (!payload.staffId || !payload.businessId || !payload.role) {
      throw new Error("Invalid token payload");
    }

    console.log("[JWT DEBUG] Incoming request:", req.method, req.url, "Payload:", payload);

    req.user = {
      staffId: payload.staffId,
      businessId: payload.businessId,
      branchId: payload.branchId || null,
      role: payload.role,
    };

    if (payload.role !== "SUPER_ADMIN" && !canBypassSubscriptionGuard(req, payload.role)) {
      const subscription = await prisma.subscription.findUnique({
        where: { businessId: payload.businessId },
        select: {
          plan: true,
          status: true,
          expiresAt: true,
          metadata: true,
        },
      });
      const deviceCount =
        subscription?.status === "TRIALING"
          ? await prisma.repairTicket.count({
              where: {
                businessId: payload.businessId,
                deletedAt: null,
              },
            })
          : 0;
      if (
        subscription?.status === "TRIALING" &&
        subscription.plan === "STARTER" &&
        deviceCount >= STARTER_TRIAL_DEVICE_LIMIT
      ) {
        await prisma.subscription.update({
          where: { businessId: payload.businessId },
          data: {
            status: "EXPIRED",
            metadata: {
              ...(subscription.metadata || {}),
              starterTrialExpiredAt: new Date().toISOString(),
              starterTrialExpiredReason: "DEVICE_LIMIT_REACHED",
            },
          },
        });
        subscription.status = "EXPIRED";
      }

      if (!isSubscriptionActive(subscription, { deviceCount })) {
        return next(
          new AppError("Subscription is pending or expired. Please complete payment and wait for super admin approval.", 402, {
            code: "SUBSCRIPTION_INACTIVE",
          })
        );
      }
    }

    return next();
  } catch (error) {
    if (error.isOperational) {
      return next(error);
    }

    return next(
      new AppError("Invalid or expired access token", 401, {
        code: AUTH_ERRORS.UNAUTHORIZED,
      })
    );
  }
};

module.exports = authenticate;
