// API Endpoint: GET + POST /api/sensor
// Stores and returns the latest pressure reading using Upstash Redis.
const { Redis } = require('@upstash/redis');

// Initialize Redis from Environment Variables 
// (KV_REST_API_URL and KV_REST_API_TOKEN)
const redis = Redis.fromEnv();

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — return latest reading from Redis
  if (req.method === 'GET') {
    try {
      console.log('[DEBUG API GET] La web esta preguntando por los datos');
      const data = await redis.get('lastReading');
      console.log('[DEBUG API GET] Datos leidos de Redis:', data);
      
      if (!data) {
        return res.status(200).json({ device_id: null, pressure: 0, timestamp: null });
      }
      return res.status(200).json(data);
    } catch (err) {
      console.error('Redis GET Error:', err);
      return res.status(500).json({ success: false, error: 'Database read error' });
    }
  }

  // POST — store new reading into Redis
  if (req.method === 'POST') {
    console.log('[DEBUG API POST] Llego POST desde el peluche!');
    console.log('[DEBUG API POST] Cuerpo:', req.body);

    const { device_id, pressure } = req.body || {};

    if (!device_id || typeof device_id !== 'string') {
      console.log('[DEBUG API POST] Rechazado: Falta string device_id');
      return res.status(400).json({ success: false, error: 'device_id is required (string)' });
    }

    if (pressure === undefined || pressure === null || typeof pressure !== 'number') {
      console.log('[DEBUG API POST] Rechazado: Falta numero pressure');
      return res.status(400).json({ success: false, error: 'pressure is required (number)' });
    }

    const payload = {
      device_id,
      pressure,
      timestamp: Date.now()
    };
    
    console.log('[DEBUG API POST] Guardando en Redis:', payload);

    try {
      // Guardar el objeto en la llave "lastReading" en Redis
      await redis.set('lastReading', payload);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Redis SET Error:', err);
      return res.status(500).json({ success: false, error: 'Database write error' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
