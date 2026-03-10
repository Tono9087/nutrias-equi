
import { database } from './firebaseConfig';
import { ref, set, get, push, onValue, query, orderByChild, limitToLast } from 'firebase/database';


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
    const pelucheRef = ref(database, `peluches/${codigoPeluche}`);
    await set(pelucheRef, {
      codigo: codigoPeluche,
      nombreUsuario: configuracion.nombreUsuario || 'Usuario',
      contactosEmergencia: configuracion.contactosEmergencia || [],
      umbralAlerta: configuracion.umbralAlerta || 70,
      preferenciasSonido: configuracion.preferenciasSonido || 'naturaleza',
      fechaVinculacion: new Date().toISOString(),
      activo: true
    });
    return { success: true, codigo: codigoPeluche };
  } catch (error) {
    console.error('Error al vincular peluche:', error);
    // Si el problema son reglas de seguridad de Firebase, el objeto error
    // suele incluir code "PERMISSION_DENIED".
    if (error.code === 'PERMISSION_DENIED') {
      return {
        success: false,
        error:
          'Permiso denegado: revisa las reglas de Realtime Database en la consola de Firebase.'
      };
    }
    return { success: false, error: error.message };
  }
};


export const obtenerConfiguracionPeluche = async (codigoPeluche) => {
  try {
    const pelucheRef = ref(database, `peluches/${codigoPeluche}`);
    const snapshot = await get(pelucheRef);
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    } else {
      return { success: false, error: 'Peluche no encontrado' };
    }
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    if (error.code === 'PERMISSION_DENIED') {
      return {
        success: false,
        error:
          'Permiso denegado: verifica las reglas de la base de datos en Firebase.'
      };
    }
    return { success: false, error: error.message };
  }
};


export const guardarLecturaSensor = async (codigoPeluche, presion) => {
  try {
    // Filtrar: solo guardar registros altos (>= 30)
    // Categorías: Bajo (<=15), Mediano (>15 y <30), Alto (>=30)
    if (presion < 30) {
      return {
        success: false,
        message: 'Lectura descartada: no alcanza categoría alta (requiere >= 30)',
        filtrado: true,
        porcentaje: presion,
        umbral: 30
      };
    }

    const lecturaRef = ref(database, `lecturas/${codigoPeluche}`);
    const nuevaLectura = push(lecturaRef);
    await set(nuevaLectura, {
      presion: presion,
      timestamp: new Date().toISOString(),
      fecha: new Date().toLocaleDateString('es-MX'),
      hora: new Date().toLocaleTimeString('es-MX')
    });
    return { success: true };
  } catch (error) {
    console.error('Error al guardar lectura:', error);
    return { success: false, error: error.message };
  }
};


export const obtenerLecturasRecientes = async (codigoPeluche, limite = 100) => {
  try {
    const lecturasRef = ref(database, `lecturas/${codigoPeluche}`);
    const lecturasQuery = query(lecturasRef, orderByChild('timestamp'), limitToLast(limite));
    const snapshot = await get(lecturasQuery);

    if (snapshot.exists()) {
      const lecturas = [];
      snapshot.forEach((childSnapshot) => {
        lecturas.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      return { success: true, data: lecturas.reverse() };
    } else {
      return { success: true, data: [] };
    }
  } catch (error) {
    console.error('Error al obtener lecturas:', error);
    return { success: false, error: error.message };
  }
};


export const escucharLecturasEnTiempoReal = (codigoPeluche, callback) => {
  const lecturasRef = ref(database, `lecturas/${codigoPeluche}`);
  const lecturasQuery = query(lecturasRef, orderByChild('timestamp'), limitToLast(1));

  return onValue(lecturasQuery, (snapshot) => {
    if (snapshot.exists()) {
      const datos = snapshot.val();
      const ultimaLectura = Object.values(datos)[0];
      callback(ultimaLectura);
    }
  });
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
