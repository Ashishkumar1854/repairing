const repairService = require("./service");
const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");

const createTicket = asyncHandler(async (req, res) => {
  const result = await repairService.createTicket(req.user, req.validatedData.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Repair ticket created",
    data: result,
  });
});

const listTickets = asyncHandler(async (req, res) => {
  const result = await repairService.listTickets(req.user, req.validatedData.query);

  return sendSuccess(res, {
    message: "Repair tickets retrieved",
    data: {
      tickets: result.tickets,
    },
    meta: {
      pagination: result.pagination,
    },
  });
});

const getTicket = asyncHandler(async (req, res) => {
  const result = await repairService.getTicket(req.user, req.validatedData.params.id);

  return sendSuccess(res, {
    message: "Repair ticket retrieved",
    data: result,
  });
});

const updateTicketStatus = asyncHandler(async (req, res) => {
  const result = await repairService.updateTicketStatus(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: result.transitionApplied
      ? "Repair ticket status updated"
      : "Repair ticket already has requested status",
    data: result,
  });
});

const updateTicketExecution = asyncHandler(async (req, res) => {
  const result = await repairService.updateTicketExecution(
    req.user,
    req.validatedData.params.id,
    req.validatedData.body
  );

  return sendSuccess(res, {
    message: "Repair ticket execution details updated",
    data: result,
  });
});

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateTicketStatus,
  updateTicketExecution,
};
