const express = require("express");

const authenticate = require("../../core/middleware/authenticate");
const authorize = require("../../core/middleware/authorize");
const validate = require("../../core/middleware/validate");
const assignmentController = require("./controller");
const {
  assignTechnicianSchema,
  reassignTechnicianSchema,
  getAssignmentHistorySchema,
  technicianQueueSchema,
  technicianDashboardSchema,
} = require("./validation");
const { ASSIGNMENT_PERMISSIONS } = require("./constants");

const repairRouter = express.Router();
const technicianRouter = express.Router();

repairRouter.post(
  "/tickets/:id/assign",
  authenticate,
  authorize(...ASSIGNMENT_PERMISSIONS.MANAGE_ASSIGNMENTS),
  validate(assignTechnicianSchema),
  assignmentController.assignTechnician
);

repairRouter.post(
  "/tickets/:id/reassign",
  authenticate,
  authorize(...ASSIGNMENT_PERMISSIONS.MANAGE_ASSIGNMENTS),
  validate(reassignTechnicianSchema),
  assignmentController.reassignTechnician
);

repairRouter.get(
  "/tickets/:id/assignments",
  authenticate,
  authorize(...ASSIGNMENT_PERMISSIONS.VIEW_ASSIGNMENTS),
  validate(getAssignmentHistorySchema),
  assignmentController.getAssignmentHistory
);

technicianRouter.get(
  "/me/queue",
  authenticate,
  authorize(...ASSIGNMENT_PERMISSIONS.VIEW_TECHNICIAN_QUEUE),
  validate(technicianQueueSchema),
  assignmentController.getMyQueue
);

technicianRouter.get(
  "/me/dashboard",
  authenticate,
  authorize(...ASSIGNMENT_PERMISSIONS.VIEW_TECHNICIAN_QUEUE),
  validate(technicianDashboardSchema),
  assignmentController.getMyDashboard
);

module.exports = {
  repairAssignmentRoutes: repairRouter,
  technicianRoutes: technicianRouter,
};
