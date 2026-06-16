const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: "Starter",
    serviceName: "Repair ERP Starter",
    monthlyPrice: 299,
    trialDeviceLimit: 50,
    branchLimit: 2,
    hasTrial: true,
  },
  GROWTH: {
    name: "Growth",
    serviceName: "Repair ERP Growth",
    monthlyPrice: 399,
    trialDeviceLimit: null,
    branchLimit: null,
    hasTrial: false,
  },
  ENTERPRISE: {
    name: "Enterprise",
    serviceName: "Repair ERP Enterprise",
    monthlyPrice: null,
    trialDeviceLimit: null,
    branchLimit: null,
    hasTrial: false,
  },
};

const DURATION_OPTIONS = [30, 90, 180, 365];

const calculatePlanPrice = (plan, durationDays) => {
  const planConfig = SUBSCRIPTION_PLANS[plan];
  if (planConfig.monthlyPrice === null) return null;
  const months = Math.max(1, Math.ceil(durationDays / 30));
  return planConfig.monthlyPrice * months;
};

module.exports = {
  DURATION_OPTIONS,
  SUBSCRIPTION_PLANS,
  calculatePlanPrice,
};
