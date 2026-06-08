const { Queue } = require("bullmq");

const { getQueueConnection } = require("./connection");

let notificationQueue;

const queueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
};

const getNotificationQueue = () => {
  if (!notificationQueue) {
    notificationQueue = new Queue("notifications", {
      ...queueOptions,
      connection: getQueueConnection(),
    });
  }

  return notificationQueue;
};

const closeQueues = async () => {
  if (notificationQueue) {
    await notificationQueue.close();
  }
};

module.exports = {
  getNotificationQueue,
  closeQueues,
};
