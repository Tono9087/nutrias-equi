const { getLecturas } = require('../storage');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const limit = parseInt(req.query.limit || '0', 10);
    let datos = await getLecturas(id);
    if (limit > 0) {
      datos = datos.slice(0, limit); // Redis lrange returns newest-first (lpush)
    }
    return res.status(200).json({ success: true, data: datos });
  }

  return res.status(405).json({ success: false, error: 'Método no permitido' });
};