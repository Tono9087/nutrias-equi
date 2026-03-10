
// las operaciones ahora se realizan a través de endpoints propios


export const generarCodigoPeluche = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = 'NUTRIA-';
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
};


export const vincularPeluche = async (codigoPeluche, configuracion) => {
  try {
    const resp = await fetch('/api/peluches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: codigoPeluche, configuracion })
    });
    const data = await resp.json();
    if (data.success) {
      return { success: true, codigo: codigoPeluche };
    } else {
      return { success: false, error: data.error || 'error' };
    }
  } catch (error) {
    console.error('Error al vincular peluche:', error);
    return { success: false, error: error.message };
  }
};


export const obtenerConfiguracionPeluche = async (codigoPeluche) => {
  try {
    const resp = await fetch(`/api/peluches/${codigoPeluche}`);
    const data = await resp.json();
    return data;
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return { success: false, error: error.message };
  }
};


export const guardarLecturaSensor = async (codigoPeluche, presion) => {
  try {
    const resp = await fetch('/api/sensor-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pelucheId: codigoPeluche, presion })
    });
    const data = await resp.json();
    return data;
  } catch (error) {
    console.error('Error al guardar lectura:', error);
    return { success: false, error: error.message };
  }
};


export const obtenerLecturasRecientes = async (codigoPeluche, limite = 100) => {
  try {
    const resp = await fetch(`/api/lecturas/${codigoPeluche}?limit=${limite}`);
    const data = await resp.json();
    return data;
  } catch (error) {
    console.error('Error al obtener lecturas:', error);
    return { success: false, error: error.message };
  }
};


export const escucharLecturasEnTiempoReal = (codigoPeluche, callback) => {
  // abrimos una conexión SSE al servidor
  const src = new EventSource(`/api/monitor/${codigoPeluche}`);
  src.onmessage = (e) => {
    try {
      const lectura = JSON.parse(e.data);
      callback(lectura);
    } catch (err) {
      console.error('error parseando evento SSE', err);
    }
  };
  src.onerror = () => {
    console.error('SSE connection error');
    src.close();
  };
  return () => src.close();
};


export const obtenerEstadisticasDia = async (codigoPeluche) => {
  try {
    const hoy = new Date().toLocaleDateString('es-MX');
    const lecturas = await obtenerLecturasRecientes(codigoPeluche, 1000);

    if (lecturas.success && lecturas.data.length > 0) {
      const lecturasHoy = lecturas.data.filter(l => l.fecha === hoy);

      if (lecturasHoy.length === 0) {
        return { success: true, data: { sinDatos: true } };
      }

      const presiones = lecturasHoy.map(l => l.presion);
      const maxPresion = Math.max(...presiones);
      const promedio = presiones.reduce((a, b) => a + b, 0) / presiones.length;
      const alertas = lecturasHoy.filter(l => l.presion >= 70).length;

      return {
        success: true,
        data: {
          totalLecturas: lecturasHoy.length,
          presionMaxima: maxPresion,
          presionPromedio: promedio.toFixed(1),
          totalAlertas: alertas,
          lecturas: lecturasHoy
        }
      };
    }

    return { success: true, data: { sinDatos: true } };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return { success: false, error: error.message };
  }
};
