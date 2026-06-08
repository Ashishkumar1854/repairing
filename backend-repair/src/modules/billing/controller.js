const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");
const billingService = require("./service");

const generateInvoice = asyncHandler(async (req, res) => {
  const result = await billingService.generateInvoice(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Invoice generated successfully",
    data: result,
  });
});

const listInvoices = asyncHandler(async (req, res) => {
  const result = await billingService.listInvoices(req.user, req.validatedData.query);

  return sendSuccess(res, {
    message: "Invoices retrieved successfully",
    data: {
      invoices: result.invoices,
    },
    meta: {
      pagination: result.pagination,
    },
  });
});

const getInvoice = asyncHandler(async (req, res) => {
  const result = await billingService.getInvoice(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Invoice retrieved successfully",
    data: result,
  });
});

const collectPayment = asyncHandler(async (req, res) => {
  const result = await billingService.collectPayment(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Payment collected successfully",
    data: result,
  });
});

const getCustomerLedger = asyncHandler(async (req, res) => {
  const result = await billingService.getCustomerLedger(
    req.user,
    req.validatedData.params.id,
    req.validatedData.query
  );

  return sendSuccess(res, {
    message: "Customer ledger retrieved successfully",
    data: {
      customer: result.customer,
      entries: result.entries,
    },
    meta: {
      pagination: result.pagination,
    },
  });
});

module.exports = {
  generateInvoice,
  listInvoices,
  getInvoice,
  collectPayment,
  getCustomerLedger,
};
