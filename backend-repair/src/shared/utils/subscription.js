const ACTIVE_SUBSCRIPTION_STATUSES = ["DONE", "ACTIVE"];
const STARTER_TRIAL_DEVICE_LIMIT = 50;
const STARTER_BRANCH_LIMIT = 2;

const calculateDaysRemaining = (expiresAt) => {
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return null;

  const millisecondsRemaining = expiry - Date.now();
  return Math.max(0, Math.ceil(millisecondsRemaining / (1000 * 60 * 60 * 24)));
};

const isWithinDateWindow = (subscription) => {
  if (!subscription?.expiresAt) return true;
  return new Date(subscription.expiresAt).getTime() > Date.now();
};

const isSubscriptionActive = (subscription, usage = {}) => {
  if (!subscription) {
    return false;
  }

  if (ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
    return isWithinDateWindow(subscription);
  }

  if (subscription.status === "TRIALING" && subscription.plan === "STARTER") {
    return isWithinDateWindow(subscription) && (usage.deviceCount || 0) < STARTER_TRIAL_DEVICE_LIMIT;
  }

  return false;
};

const shapeSubscription = (subscription, usage = {}) => {
  if (!subscription) return null;
  const deviceCount = usage.deviceCount ?? null;
  const trialDeviceLimit =
    subscription.plan === "STARTER" ? STARTER_TRIAL_DEVICE_LIMIT : null;

  return {
    ...subscription,
    daysRemaining: calculateDaysRemaining(subscription.expiresAt),
    trialDeviceLimit,
    trialDevicesUsed: deviceCount,
    trialDevicesRemaining:
      trialDeviceLimit === null || deviceCount === null
        ? null
        : Math.max(0, trialDeviceLimit - deviceCount),
    branchLimit: subscription.plan === "STARTER" ? STARTER_BRANCH_LIMIT : null,
    isServiceActive: isSubscriptionActive(subscription, usage),
  };
};

module.exports = {
  ACTIVE_SUBSCRIPTION_STATUSES,
  STARTER_BRANCH_LIMIT,
  STARTER_TRIAL_DEVICE_LIMIT,
  calculateDaysRemaining,
  isSubscriptionActive,
  shapeSubscription,
};
