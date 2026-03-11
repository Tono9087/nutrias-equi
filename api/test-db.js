import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    console.log('[DIAGNOSTICO] Intentando inicializar Redis...');
    
    // Verificar si las variables de entorno existen en Vercel
    const urlExists = !!process.env.KV_REST_API_URL;
    const tokenExists = !!process.env.KV_REST_API_TOKEN;
    
    if (!urlExists || !tokenExists) {
      return res.status(500).json({
        success: false,
        error: "Faltan variables de entorno",
        details: {
          KV_REST_API_URL_exists: urlExists,
          KV_REST_API_TOKEN_exists: tokenExists
        },
        solucion: "Debes agregar KV_REST_API_URL y KV_REST_API_TOKEN en Vercel > Settings > Environment Variables"
      });
    }

    const redis = Redis.fromEnv();
    
    // Test simple de escritura y lectura
    console.log('[DIAGNOSTICO] Variables detectadas, probando escritura...');
    await redis.set('nutria_test', 'conexion_exitosa');
    
    console.log('[DIAGNOSTICO] Probando lectura...');
    const testValue = await redis.get('nutria_test');
    
    if (testValue === 'conexion_exitosa') {
      return res.status(200).json({
        success: true,
        message: "✅ ¡Base de datos KV (Upstash Redis) conectada y funcionando perfectamente!",
        environment_keys_found: true,
        test_write_read: "OK"
      });
    } else {
      throw new Error("El valor leido no coincide con el escrito");
    }

  } catch (err) {
    console.error('[DIAGNOSTICO] Error de conexion:', err);
    return res.status(500).json({
      success: false,
      message: "❌ Error crítico al conectar con la Base de datos KV",
      error: err.message || err.toString()
    });
  }
}
