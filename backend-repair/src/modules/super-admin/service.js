const AppError = require("../../shared/errors/AppError");
const { shapeSubscription } = require("../../shared/utils/subscription");
const superAdminRepository = require("./repository");

const shapeBusiness = (business) => ({
  ...business,
  subscription: business.subscription ? shapeSubscription(business.subscription) : null,
  owner: business.staff?.[0] || null,
  staff: undefined,
});

const listBusinesses = async () => {
  const businesses = await superAdminRepository.listBusinesses();
  return { businesses: businesses.map(shapeBusiness) };
};

const getBusiness = async (businessId) => {
  const business = await superAdminRepository.findBusiness(businessId);
  if (!business) {
    throw new AppError("Business not found", 404, {
      code: "BUSINESS_NOT_FOUND",
    });
  }

  return { business: shapeBusiness(business) };
};

const setStatus = async ({ businessId: actorBusinessId }, businessId, status) => {
  if (actorBusinessId === businessId) {
    throw new AppError("Super admin platform business cannot update itself here", 400, {
      code: "SELF_BUSINESS_STATUS_CHANGE_BLOCKED",
    });
  }

  await getBusiness(businessId);
  const business = await superAdminRepository.updateStatus(businessId, status);

  return { business: shapeBusiness(business) };
};

const suspendBusiness = (actor, businessId) => setStatus(actor, businessId, "SUSPENDED");
const activateBusiness = (actor, businessId) => setStatus(actor, businessId, "ACTIVE");

const updateBusinessSubscription = async (businessId, data) => {
  const { business } = await getBusiness(businessId);
  const currentSubscription = business.subscription;
  const updateData = {};

  if (data.plan !== undefined) updateData.plan = data.plan;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.startsAt !== undefined) updateData.startsAt = data.startsAt;
  if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

  if (data.addDays !== undefined) {
    const now = new Date();
    const currentExpiry = currentSubscription?.expiresAt
      ? new Date(currentSubscription.expiresAt)
      : null;
    const baseDate = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
    updateData.expiresAt = new Date(baseDate.getTime() + data.addDays * 24 * 60 * 60 * 1000);
  }

  if (!updateData.startsAt && !currentSubscription?.startsAt) {
    updateData.startsAt = new Date();
  }

  const subscription = await superAdminRepository.upsertSubscription(businessId, updateData);
  return { subscription: shapeSubscription(subscription) };
};

const createContactRequest = async (data) => {
  return superAdminRepository.createContactRequest(data);
};

const listContactRequests = async () => {
  const contacts = await superAdminRepository.listContactRequests();
  return { contacts };
};

module.exports = {
  listBusinesses,
  getBusiness,
  suspendBusiness,
  activateBusiness,
  updateBusinessSubscription,
  createContactRequest,
  listContactRequests,
};
