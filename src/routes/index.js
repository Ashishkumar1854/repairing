const express = require("express");

const { sendSuccess } = require("../shared/helpers/apiResponse");
const authRoutes = require("../modules/auth/routes");
const customerRoutes = require("../modules/customers/routes");
const repairRoutes = require("../modules/repair/routes");

const router = express.Router();

router.get("/", (req, res) =>
  sendSuccess(res, {
    message: "backend-repair API",
    data: {
      version: "v1",
      status: "ready",
    },
  })
);

router.use("/auth", authRoutes);
router.use("/customers", customerRoutes);
router.use("/repair", repairRoutes);

module.exports = router;
