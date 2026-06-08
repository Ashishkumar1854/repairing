const { createClient } = require("redis");

const env = require("../config/env");
const logger = require("../logger/logger");

let redisClient;
let isConnecting = false;

const createRedisClient = () => {
  const client = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > env.REDIS_CONNECT_MAX_RETRIES) {
          return new Error("Redis reconnect retry limit reached");
        }

        return Math.min(retries * 50, 2000);
      },
    },
  });

  client.on("connect", () => {
    logger.info("Redis connection established");
  });

  client.on("ready", () => {
    logger.info("Redis client ready");
  });

  client.on("reconnecting", () => {
    logger.warn("Redis client reconnecting");
  });

  client.on("error", (error) => {
    logger.error({ err: error }, "Redis client error");
  });

  client.on("end", () => {
    logger.info("Redis connection closed");
  });

  return client;
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }

  return redisClient;
};

const connectRedis = async () => {
  const client = getRedisClient();

  if (client.isOpen) {
    return client;
  }

  if (isConnecting) {
    throw new Error("Redis connection is already in progress");
  }

  isConnecting = true;

  try {
    await client.connect();
    return client;
  } finally {
    isConnecting = false;
  }
};

const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
};

module.exports = {
  getRedisClient,
  connectRedis,
  disconnectRedis,
};
