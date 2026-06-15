const AppError = require("../../../shared/errors/AppError");
const businessRepository = require("./repository");

const getProfile = async ({ businessId }) => {
  const business = await businessRepository.findById(businessId);

  if (!business) {
    throw new AppError("Business profile not found", 404, {
      code: "BUSINESS_NOT_FOUND",
    });
  }

  return { business };
};

const updateProfile = async ({ businessId }, payload) => {
  if (payload.slug) {
    const existing = await businessRepository.findBySlug(payload.slug);
    if (existing && existing.id !== businessId) {
      throw new AppError("Business slug is already in use", 409, {
        code: "BUSINESS_SLUG_IN_USE",
      });
    }
  }

  const data = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  const business = await businessRepository.update(businessId, data);

  return { business };
};

module.exports = {
  getProfile,
  updateProfile,
};
