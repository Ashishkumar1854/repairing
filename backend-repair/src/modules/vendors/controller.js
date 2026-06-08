const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");
const vendorService = require("./service");

const createVendor = asyncHandler(async (req, res) => {
  const result = await vendorService.createVendor(req.user, req.validatedData.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Vendor created successfully",
    data: result,
  });
});

const listVendors = asyncHandler(async (req, res) => {
  const result = await vendorService.listVendors(req.user, req.validatedData.query);

  return sendSuccess(res, {
    message: "Vendors retrieved successfully",
    data: {
      vendors: result.vendors,
    },
    meta: {
      pagination: result.pagination,
    },
  });
});

const getVendor = asyncHandler(async (req, res) => {
  const result = await vendorService.getVendor(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Vendor retrieved successfully",
    data: result,
  });
});

const updateVendor = asyncHandler(async (req, res) => {
  const result = await vendorService.updateVendor(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: "Vendor updated successfully",
    data: result,
  });
});

const dispatchVendorRepair = asyncHandler(async (req, res) => {
  const result = await vendorService.dispatchVendorRepair(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Repair dispatched to vendor successfully",
    data: result,
  });
});

const listVendorRepairJobs = asyncHandler(async (req, res) => {
  const result = await vendorService.listVendorRepairJobs(req.user, req.validatedData.query);

  return sendSuccess(res, {
    message: "Vendor repair jobs retrieved successfully",
    data: {
      vendorRepairJobs: result.vendorRepairJobs,
    },
    meta: {
      pagination: result.pagination,
    },
  });
});

const getVendorRepairJob = asyncHandler(async (req, res) => {
  const result = await vendorService.getVendorRepairJob(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Vendor repair job retrieved successfully",
    data: result,
  });
});

const updateVendorRepairStatus = asyncHandler(async (req, res) => {
  const result = await vendorService.updateVendorRepairStatus(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: "Vendor repair status updated successfully",
    data: result,
  });
});

const receiveVendorRepair = asyncHandler(async (req, res) => {
  const result = await vendorService.receiveVendorRepair(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: "Vendor repair received successfully",
    data: result,
  });
});

const recordVendorRepairCost = asyncHandler(async (req, res) => {
  const result = await vendorService.recordVendorRepairCost(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Vendor repair cost recorded successfully",
    data: result,
  });
});

module.exports = {
  createVendor,
  listVendors,
  getVendor,
  updateVendor,
  dispatchVendorRepair,
  listVendorRepairJobs,
  getVendorRepairJob,
  updateVendorRepairStatus,
  receiveVendorRepair,
  recordVendorRepairCost,
};
