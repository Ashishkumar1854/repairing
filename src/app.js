const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const env = require("./core/config/env");
const routes = require("./routes");
const logger = require("./core/logger/logger");
const AppError = require("./shared/errors/AppError");
const { sendSuccess } = require("./shared/helpers/apiResponse");
const errorMiddleware = require("./core/middleware/errorMiddleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(cookieParser());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use((req, res, next) => {
  const incomingRequestId = req.headers["x-request-id"];
  req.id =
    typeof incomingRequestId === "string" && incomingRequestId.trim()
      ? incomingRequestId
      : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        requestId: req.id,
        ip: req.ip,
      },
      "HTTP request completed"
    );
  });

  next();
});

app.get("/", (req, res) => {
  return sendSuccess(res, {
    message: "Repair ERP Backend Running",
  });
});

app.get("/health", (req, res) => {
  return sendSuccess(res, {
    message: "Server healthy",
    data: {
      service: env.SERVICE_NAME,
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    },
  });
});

app.use("/api/v1", routes);

app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, {
    code: "ROUTE_NOT_FOUND",
  }));
});

app.use(errorMiddleware);

module.exports = app;
