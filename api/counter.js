const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async function (req, res) {
  try {
    if (req.method === 'POST') {
      // increment and return new value
      const v = await redis.incr('nammauk:visits');
      return res.status(200).json({ value: Number(v) });
    }

    // GET current value (non-incrementing)
    const cur = await redis.get('nammauk:visits');
    return res.status(200).json({ value: Number(cur || 0) });
  } catch (err) {
    console.error('counter error', err);
    res.status(500).json({ error: 'server_error' });
  }
};
