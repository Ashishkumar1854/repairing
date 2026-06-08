const http = require("http");

const env = require("./core/config/env");
const logger = require("./core/logger/logger");
const app = require("./app");
const prisma = require("./core/database/prisma");
const { connectRedis, disconnectRedis } = require("./core/redis/redis");
const { closeQueues } = require("./core/queue");

const PORT = env.PORT;
let server;
let isShuttingDown = false;

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Shutdown signal received");

  try {
    if (server && server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      logger.info("HTTP server closed");
    }

    await closeQueues();
    await disconnectRedis();
    await prisma.$disconnect();
  } catch (error) {
    logger.error({ err: error }, "Shutdown failed");
    process.exit(1);
  }

  process.exit(exitCode);
};

const bootstrap = async () => {
  await connectRedis();

  server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        environment: env.NODE_ENV,
      },
      `Server running at http://localhost:${PORT}`
    );
  });
};

process.on("unhandledRejection", (err) => {
  logger.fatal({ err }, "Unhandled promise rejection");
  shutdown("unhandledRejection", 1);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM", 0);
});

process.on("SIGINT", () => {
  shutdown("SIGINT", 0);
});

bootstrap().catch((error) => {
  logger.fatal({ err: error }, "Server bootstrap failed");
  shutdown("bootstrapFailure", 1);
});
