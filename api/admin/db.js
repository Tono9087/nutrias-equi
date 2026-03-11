// Endpoint de diagnóstico: GET /api/admin/db
// Muestra el contenido de Redis (solo para desarrollo/debug)
// ⚠️  Eliminar o proteger con password antes de ir a producción real
const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    // Obtener la última lectura del sensor
    const lastReading = await redis.get('lastReading');

    // Buscar todas las llaves de peluche y lecturas
    const keys = await redis.keys('*');

    const resultado = { lastReading, keys, peluches: {}, lecturas: {} };

    for (const key of keys) {
      if (key.startsWith('peluche:')) {
        resultado.peluches[key] = await redis.get(key);
      } else if (key.startsWith('lecturas:')) {
        resultado.lecturas[key] = await redis.lrange(key, 0, 9); // últimas 10
      }
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ success: true, data: resultado });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
