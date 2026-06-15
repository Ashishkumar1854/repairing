const AppError = require("../../shared/errors/AppError");
const superAdminRepository = require("./repository");

const shapeBusiness = (business) => ({
  ...business,
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
  createContactRequest,
  listContactRequests,
};
