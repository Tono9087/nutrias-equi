const { addPeluche, getPeluche } = require('../storage');

function validarCodigo(codigo) {
  return typeof codigo === 'string' && /^NUTRIA-[A-Z0-9]{6}$/.test(codigo);
}

module.exports = async function handler(req, res) {
  // POST /api/peluches -> crea o actualiza configuración del peluche
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Sólo POST' });
  }

  const { codigo, configuracion } = req.body;
  if (!validarCodigo(codigo)) {
    return res.status(400).json({ success: false, error: 'Código de peluche inválido' });
  }

  const configObj = {
    nombreUsuario: configuracion?.nombreUsuario || 'Usuario',
    contactosEmergencia: configuracion?.contactosEmergencia || [],
    umbralAlerta: configuracion?.umbralAlerta || 70,
    preferenciasSonido: configuracion?.preferenciasSonido || 'naturaleza',
    fechaVinculacion: new Date().toISOString(),
    activo: true
  };

  await addPeluche(codigo, configObj);
  return res.status(200).json({ success: true, data: configObj });
};