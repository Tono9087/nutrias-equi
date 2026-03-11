// Persistent storage using Upstash Redis
// Replaces the previous in-memory implementation which reset on every
// Vercel serverless cold start.
const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

// ─── Peluche helpers ───────────────────────────────────────────────────────

async function getPeluche(id) {
  return await redis.get(`peluche:${id}`);
}

async function addPeluche(id, config) {
  const data = { ...config, codigo: id };
  await redis.set(`peluche:${id}`, data);
  return data;
}

// ─── Lecturas helpers ──────────────────────────────────────────────────────

async function getLecturas(id) {
  const data = await redis.lrange(`lecturas:${id}`, 0, -1);
  return data || [];
}

async function addLectura(id, lectura) {
  await redis.lpush(`lecturas:${id}`, lectura);
  // Keep only latest 1000 readings
  await redis.ltrim(`lecturas:${id}`, 0, 999);
  return lectura;
}

async function getLatestLectura(id) {
  const arr = await redis.lrange(`lecturas:${id}`, 0, 0);
  return arr && arr.length ? arr[0] : null;
}

module.exports = { getPeluche, addPeluche, getLecturas, addLectura, getLatestLectura };
