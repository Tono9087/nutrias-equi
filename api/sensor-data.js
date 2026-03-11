// API Endpoint para recibir datos del sensor FSR del ESP32
// Ruta: /api/sensor-data
//
// IMPORTANTE: Este es un endpoint serverless de Vercel.
// Para usarlo en desarrollo local: npm install -g vercel && vercel dev

import { getPeluche, addLectura } from './storage';

// Valida el formato del código de peluche
function validarCodigoPeluche(codigo) {
  if (!codigo || typeof codigo !== 'string') {
    return false;
  }
  const regex = /^NUTRIA-[A-Z0-9]{6}$/;
  return regex.test(codigo);
}

// Valida que la presión sea un número entre 0 y 100
function validarPresion(presion) {
  const num = Number(presion);
  return !isNaN(num) && num >= 0 && num <= 100;
}

// Handler del endpoint
export default async function handler(req, res) {
  // Configurar CORS para permitir peticiones desde el ESP32
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar peticiones OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo aceptar peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido. Usa POST.'
    });
  }

  try {
    const { pelucheId, presion } = req.body;

    // Validar datos recibidos
    if (!validarCodigoPeluche(pelucheId)) {
      return res.status(400).json({
        success: false,
        error: 'Código de peluche inválido. Formato esperado: NUTRIA-XXXXXX'
      });
    }

    if (!validarPresion(presion)) {
      return res.status(400).json({
        success: false,
        error: 'Porcentaje de presión inválido. Debe ser un número entre 0 y 100.'
      });
    }

    const porcentajeFuerza = Number(presion);

    // Filtrar: solo guardar registros altos (>= 30)
    // Categorías: Bajo (<=15), Mediano (>15 y <30), Alto (>=30)
    if (porcentajeFuerza < 30) {
      return res.status(200).json({
        success: true,
        message: 'Lectura descartada: no alcanza categoría alta (requiere >= 30)',
        data: {
          pelucheId,
          porcentaje: porcentajeFuerza,
          umbral: 30,
          guardado: false
        }
      });
    }

    // Eliminar la restricción de que el peluche debe existir en memoria
    // ya que Vercel borra la memoria entre ejecuciones (cold starts / serverless).
    // Si la placa manda un POST, simplemente aceptamos y guardamos la lectura.

    // Guardar la lectura en el almacenamiento local (solo registros altos >= 30)
    addLectura(pelucheId, {
      presion: porcentajeFuerza,
      timestamp: new Date().toISOString(),
      fecha: new Date().toLocaleDateString('es-MX'),
      hora: new Date().toLocaleTimeString('es-MX')
    });

    // Responder con éxito
    return res.status(200).json({
      success: true,
      message: 'Lectura guardada correctamente (categoría alta >= 30)',
      data: {
        pelucheId,
        porcentaje: porcentajeFuerza,
        umbral: 30,
        guardado: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error al procesar datos del sensor:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
