const customerService = require("./service");
const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");

const searchCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.searchCustomers(req.user, req.validatedData.query);

  return sendSuccess(res, {
    message: "Customers retrieved",
    data: result,
  });
});

const getCustomerTickets = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerTickets(
    req.user,
    req.validatedData.params.id,
    req.validatedData.query
  );

  return sendSuccess(res, {
    message: "Customer ticket history retrieved",
    data: {
      customer: result.customer,
      tickets: result.tickets,
    },
    meta: {
      pagination: result.pagination,
    },
  });
});

module.exports = {
  searchCustomers,
  getCustomerTickets,
};
