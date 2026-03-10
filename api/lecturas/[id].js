import { getLecturas } from '../storage';

export default function handler(req, res) {
  const {
    query: { id },
    method
  } = req;

  if (method === 'GET') {
    const limit = parseInt(req.query.limit || '0', 10);
    let datos = getLecturas(id);
    if (limit > 0) {
      datos = datos.slice(-limit);
    }
    return res.status(200).json({ success: true, data: datos });
  }

  return res.status(405).json({ success: false, error: 'Método no permitido' });
}