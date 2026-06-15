const express = require("express");

const validate = require("../../core/middleware/validate");
const authenticate = require("../../core/middleware/authenticate");
const { loginRateLimiter } = require("../../core/middleware/authRateLimiter");
const authController = require("./controller");
const {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  branchesByEmailSchema,
} = require("./validation");

const router = express.Router();

router.post("/login", loginRateLimiter, validate(loginSchema), authController.login);
router.get("/branches-by-email", validate(branchesByEmailSchema), authController.getBranchesByEmail);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);
router.post("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

module.exports = router;
