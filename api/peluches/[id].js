import { getPeluche } from '../storage';

export default function handler(req, res) {
  const {
    query: { id }
  } = req;

  if (req.method === 'GET') {
    let peluche = getPeluche(id);
    if (!peluche) {
      // In Vercel serverless, memory is cleared between cold starts.
      // If we ask for a peluche and it's not in memory, we automatically recreate it 
      // with default values so the frontend doesn't crash with a 404.
      const configObj = {
        nombreUsuario: 'Usuario',
        contactosEmergencia: [],
        umbralAlerta: 70,
        preferenciasSonido: 'naturaleza',
        fechaVinculacion: new Date().toISOString(),
        activo: true,
        codigo: id
      };
      
      // Auto-recreate in memory
      import('../storage').then(({ addPeluche }) => {
        addPeluche(id, configObj);
      }).catch(e => console.error("Could not dynamic import storage", e));
      
      peluche = configObj;
    }
    return res.status(200).json({ success: true, data: peluche });
  }

  return res.status(405).json({ success: false, error: 'Método no permitido' });
}