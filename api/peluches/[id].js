const { getPeluche } = require('../storage');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const peluche = await getPeluche(id);
    if (!peluche) {
      return res.status(404).json({ success: false, error: 'Peluche no encontrado' });
    }
    return res.status(200).json({ success: true, data: peluche });
  }

  return res.status(405).json({ success: false, error: 'Método no permitido' });
};