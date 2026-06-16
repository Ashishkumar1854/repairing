const subscriptionRepository = require("./repository");
const env = require("../../../core/config/env");
const AppError = require("../../../shared/errors/AppError");
const { shapeSubscription } = require("../../../shared/utils/subscription");
const { DURATION_OPTIONS, SUBSCRIPTION_PLANS, calculatePlanPrice } = require("./constants");

const defaultSubscription = (businessId) =>
  shapeSubscription({
    businessId,
    plan: "STARTER",
    status: "PENDING",
    startsAt: null,
    expiresAt: null,
    metadata: null,
  });

const getPlanOptions = () =>
  Object.entries(SUBSCRIPTION_PLANS).map(([plan, config]) => ({
    plan,
    name: config.name,
    serviceName: config.serviceName,
    monthlyPrice: config.monthlyPrice,
    trialDeviceLimit: config.trialDeviceLimit,
    branchLimit: config.branchLimit,
    hasTrial: config.hasTrial,
  }));

const sanitizeWhatsappNumber = (value) => String(value || "").replace(/\D/g, "");

const buildWhatsappUrl = (message) => {
  const number = sanitizeWhatsappNumber(env.PAY_WHATSAPP);
  if (!number) {
    throw new AppError("Payment WhatsApp number is not configured", 500, {
      code: "PAY_WHATSAPP_NOT_CONFIGURED",
    });
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

const buildPaymentMessage = ({ business, owner, plan, durationDays, price, serviceName }) =>
  [
    "Subscription payment request",
    `Business: ${business.name} (${business.slug})`,
    `Owner: ${owner?.fullName || "Not assigned"}`,
    `Owner email: ${owner?.email || business.email || "Not set"}`,
    `Service: ${serviceName}`,
    `Plan: ${plan}`,
    `Duration: ${durationDays} days`,
    price === null ? "Price: Custom quote" : `Price: INR ${price}`,
    "Please confirm payment and activate this subscription.",
  ].join("\n");

const current = async ({ businessId }) => {
  const subscription = await subscriptionRepository.findCurrent(businessId);
  const deviceCount = await subscriptionRepository.countDevices(businessId);
  const branchCount = await subscriptionRepository.countBranches(businessId);
  let currentSubscription = subscription;

  if (
    currentSubscription?.status === "TRIALING" &&
    currentSubscription.plan === "STARTER" &&
    deviceCount >= SUBSCRIPTION_PLANS.STARTER.trialDeviceLimit
  ) {
    currentSubscription = await subscriptionRepository.expireTrial(businessId, {
      ...(currentSubscription.metadata || {}),
      starterTrialExpiredAt: new Date().toISOString(),
      starterTrialExpiredReason: "DEVICE_LIMIT_REACHED",
    });
  }

  return {
    subscription: currentSubscription
      ? shapeSubscription(currentSubscription, { deviceCount })
      : defaultSubscription(businessId),
    planOptions: getPlanOptions(),
    durationOptions: DURATION_OPTIONS,
    usage: {
      deviceCount,
      branchCount,
    },
  };
};

const startTrial = async ({ businessId }) => {
  const currentSubscription = await subscriptionRepository.findCurrent(businessId);
  const deviceCount = await subscriptionRepository.countDevices(businessId);

  if (deviceCount >= SUBSCRIPTION_PLANS.STARTER.trialDeviceLimit) {
    throw new AppError("Starter trial limit is already used. Please choose a paid plan.", 402, {
      code: "STARTER_TRIAL_LIMIT_REACHED",
    });
  }

  if (currentSubscription?.metadata?.starterTrialStartedAt) {
    throw new AppError("Starter trial has already been used for this business", 409, {
      code: "STARTER_TRIAL_ALREADY_USED",
    });
  }

  if (["DONE", "ACTIVE"].includes(currentSubscription?.status)) {
    throw new AppError("Subscription is already active", 409, {
      code: "SUBSCRIPTION_ALREADY_ACTIVE",
    });
  }

  const subscription = await subscriptionRepository.upsertTrial(businessId, {
    ...(currentSubscription?.metadata || {}),
    starterTrialStartedAt: new Date().toISOString(),
    starterTrialDeviceLimit: SUBSCRIPTION_PLANS.STARTER.trialDeviceLimit,
    starterBranchLimit: SUBSCRIPTION_PLANS.STARTER.branchLimit,
  });

  return {
    subscription: shapeSubscription(subscription, { deviceCount }),
  };
};

const requestPayment = async ({ businessId }, { plan, durationDays }) => {
  const business = await subscriptionRepository.findBusiness(businessId);
  if (!business) {
    throw new AppError("Business not found", 404, {
      code: "BUSINESS_NOT_FOUND",
    });
  }

  const planConfig = SUBSCRIPTION_PLANS[plan];
  const price = calculatePlanPrice(plan, durationDays);
  const owner = business.staff?.[0] || null;
  const requestedAt = new Date();
  const paymentRequest = {
    plan,
    serviceName: planConfig.serviceName,
    durationDays,
    price,
    currency: "INR",
    requestedAt: requestedAt.toISOString(),
  };

  const message = buildPaymentMessage({
    business,
    owner,
    plan,
    durationDays,
    price,
    serviceName: planConfig.serviceName,
  });

  const subscription = await subscriptionRepository.upsertPaymentRequest(businessId, {
    plan,
    status: "PENDING",
    metadata: {
      ...(business.subscription?.metadata || {}),
      paymentRequest,
    },
  });

  return {
    subscription: shapeSubscription(subscription, {
      deviceCount: await subscriptionRepository.countDevices(businessId),
    }),
    paymentRequest,
    whatsappUrl: buildWhatsappUrl(message),
  };
};

module.exports = {
  current,
  startTrial,
  requestPayment,
};
