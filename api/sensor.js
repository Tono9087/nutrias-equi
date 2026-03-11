// API Endpoint: GET + POST /api/sensor
// Stores and returns the latest pressure reading (in-memory).

let lastReading = {
  device_id: null,
  pressure: null,
  timestamp: null
};

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — return latest reading
  if (req.method === 'GET') {
    return res.status(200).json(lastReading);
  }

  // POST — store new reading
  if (req.method === 'POST') {
    const { device_id, pressure } = req.body || {};

    if (!device_id || typeof device_id !== 'string') {
      return res.status(400).json({ success: false, error: 'device_id is required (string)' });
    }

    if (pressure === undefined || pressure === null || typeof pressure !== 'number') {
      return res.status(400).json({ success: false, error: 'pressure is required (number)' });
    }

    lastReading = {
      device_id,
      pressure,
      timestamp: Date.now()
    };

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
