// API Endpoint para recibir datos del sensor FSR del ESP32
// Ruta: /api/sensor-data
const { getPeluche, addLectura } = require('./storage');

// Valida el formato del código de peluche
function validarCodigoPeluche(codigo) {
  if (!codigo || typeof codigo !== 'string') return false;
  return /^NUTRIA-[A-Z0-9]{6}$/.test(codigo);
}

// Valida que la presión sea un número entre 0 y 100
function validarPresion(presion) {
  const num = Number(presion);
  return !isNaN(num) && num >= 0 && num <= 100;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido. Usa POST.' });
  }

  try {
    const { pelucheId, presion } = req.body;

    if (!validarCodigoPeluche(pelucheId)) {
      return res.status(400).json({ success: false, error: 'Código de peluche inválido. Formato esperado: NUTRIA-XXXXXX' });
    }

    if (!validarPresion(presion)) {
      return res.status(400).json({ success: false, error: 'Porcentaje de presión inválido. Debe ser un número entre 0 y 100.' });
    }

    const porcentajeFuerza = Number(presion);

    // Solo guardar registros altos (>= 30)
    if (porcentajeFuerza < 30) {
      return res.status(200).json({
        success: true,
        message: 'Lectura descartada: no alcanza categoría alta (requiere >= 30)',
        data: { pelucheId, porcentaje: porcentajeFuerza, umbral: 30, guardado: false }
      });
    }

    // Verificar que el peluche existe en Redis
    const peluche = await getPeluche(pelucheId);
    if (!peluche) {
      return res.status(404).json({
        success: false,
        error: 'Peluche no encontrado. Por favor vincúlalo primero en la aplicación web.'
      });
    }

    // Guardar la lectura en Redis
    await addLectura(pelucheId, {
      presion: porcentajeFuerza,
      timestamp: new Date().toISOString(),
      fecha: new Date().toLocaleDateString('es-MX'),
      hora: new Date().toLocaleTimeString('es-MX')
    });

    return res.status(200).json({
      success: true,
      message: 'Lectura guardada correctamente (categoría alta >= 30)',
      data: { pelucheId, porcentaje: porcentajeFuerza, umbral: 30, guardado: true, timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Error al procesar datos del sensor:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
