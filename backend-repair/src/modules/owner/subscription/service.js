const subscriptionRepository = require("./repository");

const current = async ({ businessId }) => {
  const subscription = await subscriptionRepository.findCurrent(businessId);

  return {
    subscription:
      subscription ||
      {
        businessId,
        plan: "STARTER",
        status: "ACTIVE",
        startsAt: null,
        expiresAt: null,
      },
  };
};

module.exports = {
  current,
};
