const { PrismaClient } = require("../../generated/prisma");

const logger = require("../logger/logger");

const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "info" },
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
  ],
});

prisma.$on("query", (event) => {
  logger.debug(
    {
      query: event.query,
      duration: event.duration,
      target: event.target,
    },
    "Prisma query executed"
  );
});

prisma.$on("info", (event) => {
  logger.info({ target: event.target }, event.message);
});

prisma.$on("warn", (event) => {
  logger.warn({ target: event.target }, event.message);
});

prisma.$on("error", (event) => {
  logger.error({ target: event.target }, event.message);
});

module.exports = prisma;
