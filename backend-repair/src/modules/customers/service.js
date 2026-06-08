const AppError = require("../../shared/errors/AppError");
const customerRepository = require("./repository");

const CUSTOMER_ERRORS = Object.freeze({
  CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND",
});

const searchCustomers = async (user, query) => {
  const customers = await customerRepository.searchCustomers({
    businessId: user.businessId,
    query: query.query,
    limit: query.limit,
  });

  return {
    customers,
  };
};

const getCustomerTickets = async (user, customerId, query) => {
  const customer = await customerRepository.findCustomerById(user.businessId, customerId);

  if (!customer) {
    throw new AppError("Customer not found", 404, {
      code: CUSTOMER_ERRORS.CUSTOMER_NOT_FOUND,
    });
  }

  const { tickets, total } = await customerRepository.getCustomerTickets({
    businessId: user.businessId,
    customerId,
    page: query.page,
    limit: query.limit,
  });

  return {
    customer,
    tickets,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

module.exports = {
  searchCustomers,
  getCustomerTickets,
};
