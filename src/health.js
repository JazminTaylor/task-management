const express = require('express');
const pool = require('./database');
const redis = require('./redis');

const router = express.Router();

router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    redis: 'unknown'
  };

  // Check database
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB timeout')), 5000)
      )
    ]);
    health.database = 'connected';
  } catch (err) {
    health.status = 'degraded';
    health.database = 'failed';
  }

  // Check Redis
  try {
    if (redis.client) {
      await Promise.race([
        redis.client.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 2000)
        )
      ]);
      health.redis = 'connected';
    } else {
      health.redis = 'disabled';
    }
  } catch (err) {
    health.redis = 'disabled'; // OK to fail
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
