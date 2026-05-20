const express = require("express");

const validate = require("../../core/middleware/validate");
const authenticate = require("../../core/middleware/authenticate");
const { loginRateLimiter } = require("../../core/middleware/authRateLimiter");
const authController = require("./controller");
const { loginSchema, refreshSchema } = require("./validation");

const router = express.Router();

router.post("/login", loginRateLimiter, validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

module.exports = router;
