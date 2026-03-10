import { onNewLectura, removeLecturaListener } from '../storage';

export default function handler(req, res) {
  const {
    query: { id }
  } = req;

  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  // cabeceras SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const listener = (lectura) => {
    res.write(`data: ${JSON.stringify(lectura)}\n\n`);
  };

  onNewLectura(id, listener);

  req.on('close', () => {
    removeLecturaListener(id, listener);
  });
}
