const { Worker } = require("bullmq");

const env = require("../../config/env");
const logger = require("../../logger/logger");
const { getQueueConnection } = require("../connection");

const createNotificationWorker = () => {
  const worker = new Worker(
    "notifications",
    async (job) => {
      logger.info(
        {
          jobId: job.id,
          jobName: job.name,
          businessId: job.data && job.data.businessId,
        },
        "Notification job received"
      );

      return {
        accepted: true,
      };
    },
    {
      connection: getQueueConnection(),
      concurrency: env.NOTIFICATION_WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, "Notification job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job && job.id, jobName: job && job.name, err: error },
      "Notification job failed"
    );
  });

  return worker;
};

module.exports = {
  createNotificationWorker,
};
