const pino = require("pino");

const env = require("../config/env");

const isDevelopment = env.NODE_ENV !== "production";

const loggerOptions = {
  level: env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  base: {
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (isDevelopment) {
  loggerOptions.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  };
}

const logger = pino(loggerOptions);

module.exports = logger;
