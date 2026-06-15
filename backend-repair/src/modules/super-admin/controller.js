const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");
const superAdminService = require("./service");

const listBusinesses = asyncHandler(async (req, res) => {
  const result = await superAdminService.listBusinesses();

  return sendSuccess(res, {
    message: "Businesses list",
    data: result,
  });
});

const getBusiness = asyncHandler(async (req, res) => {
  const result = await superAdminService.getBusiness(req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Business details",
    data: result,
  });
});

const suspendBusiness = asyncHandler(async (req, res) => {
  const result = await superAdminService.suspendBusiness(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Business suspended",
    data: result,
  });
});

const activateBusiness = asyncHandler(async (req, res) => {
  const result = await superAdminService.activateBusiness(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Business activated",
    data: result,
  });
});

const createContactRequest = asyncHandler(async (req, res) => {
  const result = await superAdminService.createContactRequest(req.validatedData.body);

  return sendSuccess(res, {
    message: "Contact request submitted successfully",
    data: result,
  });
});

const listContactRequests = asyncHandler(async (req, res) => {
  const result = await superAdminService.listContactRequests();

  return sendSuccess(res, {
    message: "Contact requests list",
    data: result,
  });
});

module.exports = {
  listBusinesses,
  getBusiness,
  suspendBusiness,
  activateBusiness,
  createContactRequest,
  listContactRequests,
};
