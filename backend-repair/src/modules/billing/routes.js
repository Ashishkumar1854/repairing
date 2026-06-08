const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const billingController = require("./controller");
const {
  generateInvoiceSchema,
  listInvoicesSchema,
  getInvoiceSchema,
  collectPaymentSchema,
  customerLedgerSchema,
} = require("./validation");
const { BILLING_PERMISSIONS } = require("./constants");

const repairRouter = express.Router();
const billingRouter = express.Router();
const customerRouter = express.Router();

repairRouter.post(
  "/tickets/:id/invoice",
  authenticate,
  authorize(...BILLING_PERMISSIONS.GENERATE_INVOICE),
  validate(generateInvoiceSchema),
  billingController.generateInvoice
);

billingRouter.get(
  "/invoices",
  authenticate,
  authorize(...BILLING_PERMISSIONS.VIEW_INVOICES),
  validate(listInvoicesSchema),
  billingController.listInvoices
);

billingRouter.get(
  "/invoices/:id",
  authenticate,
  authorize(...BILLING_PERMISSIONS.VIEW_INVOICES),
  validate(getInvoiceSchema),
  billingController.getInvoice
);

billingRouter.post(
  "/invoices/:id/payments",
  authenticate,
  authorize(...BILLING_PERMISSIONS.COLLECT_PAYMENT),
  validate(collectPaymentSchema),
  billingController.collectPayment
);

customerRouter.get(
  "/:id/ledger",
  authenticate,
  authorize(...BILLING_PERMISSIONS.VIEW_LEDGER),
  validate(customerLedgerSchema),
  billingController.getCustomerLedger
);

module.exports = {
  repairBillingRoutes: repairRouter,
  billingRoutes: billingRouter,
  customerBillingRoutes: customerRouter,
};
