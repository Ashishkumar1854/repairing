const env = require("../config/env");

const parseRedisUrl = (url) => {
  const redisUrl = new URL(url);

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: redisUrl.pathname ? Number(redisUrl.pathname.replace("/", "") || 0) : 0,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > env.REDIS_CONNECT_MAX_RETRIES) {
        return null;
      }

      return Math.min(times * 50, 2000);
    },
  };
};

const getQueueConnection = () => parseRedisUrl(env.REDIS_URL);

module.exports = {
  getQueueConnection,
};
