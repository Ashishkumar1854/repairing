const { getNotificationQueue, closeQueues } = require("./queues");
const { createNotificationWorker } = require("./workers/notificationWorker");

module.exports = {
  getNotificationQueue,
  closeQueues,
  createNotificationWorker,
};
