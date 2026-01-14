const redis = require('redis');

let client = null;
let isHealthy = false;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        retryStrategy: () => null // Don't auto-retry
      }
    });

    client.on('error', (err) => {
      console.error('Redis error:', err);
      isHealthy = false;
    });

    client.on('connect', () => {
      console.log('Redis connected');
      isHealthy = true;
    });

    client.on('disconnect', () => {
      console.log('Redis disconnected');
      isHealthy = false;
    });

    await client.connect();
  } catch (err) {
    console.error('Redis connection failed:', err);
    isHealthy = false;
  }
};

const getFromCache = async (key) => {
  if (!isHealthy || !client) return null;
  
  try {
    return await client.get(key);
  } catch (err) {
    console.error('Redis get error:', err);
    isHealthy = false;
    return null;
  }
};

const setCache = async (key, value, ttl = 3600) => {
  if (!isHealthy || !client) return;
  
  try {
    await client.setEx(key, ttl, value);
  } catch (err) {
    console.error('Redis set error:', err);
    isHealthy = false;
  }
};

module.exports = {
  connectRedis,
  getFromCache,
  setCache,
  client,
  isHealthy: () => isHealthy
};
