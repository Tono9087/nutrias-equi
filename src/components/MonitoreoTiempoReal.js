import { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import { obtenerConfiguracionPeluche, obtenerLecturasRecientes } from '../pelucheUtils';
import { gestorAudio, sonidosDisponibles, videosYouTube } from '../soundManager';
import { getLatestSensorReading } from '../services/sensorApi';

const MonitoreoTiempoReal = () => {
  const [codigoPeluche, setCodigoPeluche] = useState('');
  const [presionActual, setPresionActual] = useState(0);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [configuracion, setConfiguracion] = useState(null);
  const [conectado, setConectado] = useState(false);
  const [historialReciente, setHistorialReciente] = useState([]);
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [audioActivo, setAudioActivo] = useState(false);
  const [tipoReproduccion, setTipoReproduccion] = useState('audio'); // 'audio' o 'youtube'
  const [videoSeleccionado, setVideoSeleccionado] = useState('respiracion');

  useEffect(() => {
    const codigoGuardado = localStorage.getItem('codigoPelucheActual');
    if (codigoGuardado) {
      setCodigoPeluche(codigoGuardado);
      iniciarMonitoreo(codigoGuardado);
    }
  }, []);

  // Polling: fetch latest sensor reading every second once connected
  useEffect(() => {
    if (!conectado) return;

    async function poll() {
      try {
        const data = await getLatestSensorReading();
        if (data.pressure !== null && data.pressure !== undefined) {
          setPresionActual(data.pressure);
          setUltimaActualizacion(data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString());
          // Add to history
          const lectura = {
            presion: data.pressure,
            timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
            hora: new Date(data.timestamp || Date.now()).toLocaleTimeString('es-MX')
          };
          setHistorialReciente(prev => {
            // Avoid duplicate if timestamp hasn't changed
            if (prev.length > 0 && prev[0].timestamp === lectura.timestamp) return prev;
            return [lectura, ...prev.slice(0, 9)];
          });
        }
      } catch (err) {
        console.error('Error polling sensor:', err);
      }
    }

    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [conectado]);

  useEffect(() => {
    // Verificar si se debe activar alerta
    if (configuracion && presionActual >= configuracion.umbralAlerta) {
      if (!mostrarAlerta) {
        setMostrarAlerta(true);
        activarSonidoEmergencia();
      }
    } else {
      if (mostrarAlerta) {
        setMostrarAlerta(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presionActual, configuracion]);

  const iniciarMonitoreo = async (codigo) => {
    // cuando iniciamos monitoreo pedimos configuración y datos
    let config = await obtenerConfiguracionPeluche(codigo);

    if (!config.success) {
      console.warn('No se pudo obtener la configuración del servidor:', config.error);
      // intentemos cargar el JSON que guardamos en localStorage cuando
      // vinculamos el peluche; en un entorno serverless la memoria se pierde
      // entre llamadas, así que esto es normal.
      const almacenada = localStorage.getItem(`configuracion_${codigo}`);
      if (almacenada) {
        console.info('Usando configuración almacenada en localStorage');
        config = { success: true, data: JSON.parse(almacenada) };
      } else {
        alert(`Error al recuperar la configuración: ${config.error}`);
        return;
      }
    }

    setConfiguracion(config.data);
    setConectado(true);

    // Cargar últimas 10 lecturas
    const lecturas = await obtenerLecturasRecientes(codigo, 10);
    if (lecturas.success) {
      setHistorialReciente(lecturas.data);
      if (lecturas.data.length > 0) {
        setPresionActual(lecturas.data[0].presion);
        setUltimaActualizacion(lecturas.data[0].timestamp);
      }
    }
    // Polling is handled by the useEffect above, triggered by setConectado(true)
  };

  const activarSonidoEmergencia = () => {
    if (configuracion && !audioActivo) {
      const preferencia = configuracion.preferenciasSonido || 'naturaleza';
      gestorAudio.reproducir(preferencia);
      setAudioActivo(true);
    }
  };

  const handleReproducirAudio = (tipo) => {
    gestorAudio.reproducir(tipo);
    setAudioActivo(true);
    setTipoReproduccion('audio');
  };

  const handleDetenerAudio = () => {
    gestorAudio.detener();
    setAudioActivo(false);
  };

  const getNivelPresion = (presion) => {
    if (presion >= 30) return { nivel: 'CRISIS', color: '#f44336', emoji: '🔴' };
    if (presion >= 15) return { nivel: 'ATENCIÓN', color: '#ff9800', emoji: '🟡' };
    return { nivel: 'CALMA', color: '#4caf50', emoji: '🟢' };
  };

  const nivel = getNivelPresion(presionActual);

  const handleConectar = (e) => {
    e.preventDefault();
    if (codigoPeluche.trim()) {
      localStorage.setItem('codigoPelucheActual', codigoPeluche);
      iniciarMonitoreo(codigoPeluche);
    }
  };

  if (!conectado) {
    return (
      <div style={styles.container}>
        <h2 style={styles.titulo}>🎛️ Monitoreo en Tiempo Real</h2>
        <div style={styles.conectarCard}>
          <p>Ingresa el código de tu peluche para iniciar el monitoreo:</p>
          <form onSubmit={handleConectar} style={styles.form}>
            <input
              type="text"
              value={codigoPeluche}
              onChange={(e) => setCodigoPeluche(e.target.value.toUpperCase())}
              placeholder="NUTRIA-XXXXX"
              style={styles.input}
              required
            />
            <button type="submit" style={styles.botonConectar}>
              🔌 Conectar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Alerta de Crisis */}
      {mostrarAlerta && (
        <div style={styles.alertaBanner}>
          🚨 <strong>ALERTA DE CRISIS</strong> - Presión elevada detectada: {presionActual}
        </div>
      )}

      <div style={styles.header}>
        <h2 style={styles.titulo}>🎛️ Monitoreo en Tiempo Real</h2>
        <div style={styles.codigoTag}>{codigoPeluche}</div>
      </div>

      {/* Indicador Principal de Presión */}
      <div style={{...styles.indicadorPrincipal, backgroundColor: nivel.color}}>
        <div style={styles.presionDisplay}>
          <div style={styles.presionNumero}>{presionActual}</div>
          <div style={styles.presionLabel}>PRESIÓN ACTUAL</div>
        </div>
        <div style={styles.nivelDisplay}>
          <span style={styles.nivelEmoji}>{nivel.emoji}</span>
          <span style={styles.nivelTexto}>{nivel.nivel}</span>
        </div>
      </div>

      {ultimaActualizacion && (
        <div style={styles.ultimaActualizacion}>
          Última actualización: {new Date(ultimaActualizacion).toLocaleString('es-MX')}
        </div>
      )}

      {/* Controles de Audio */}
      <div style={styles.audioControles}>
        <h3 style={styles.subtitulo}>🎵 Sonidos Relajantes</h3>

        <div style={styles.tipoReproduccion}>
          <button
            onClick={() => setTipoReproduccion('audio')}
            style={{
              ...styles.botonTipo,
              backgroundColor: tipoReproduccion === 'audio' ? '#4caf50' : '#ccc'
            }}
          >
            🔊 Audio Local
          </button>
          <button
            onClick={() => setTipoReproduccion('youtube')}
            style={{
              ...styles.botonTipo,
              backgroundColor: tipoReproduccion === 'youtube' ? '#f44336' : '#ccc'
            }}
          >
            ▶️ YouTube
          </button>
        </div>

        {tipoReproduccion === 'audio' ? (
          <div style={styles.botonesAudio}>
            {Object.keys(sonidosDisponibles).map((tipo) => (
              <button
                key={tipo}
                onClick={() => handleReproducirAudio(tipo)}
                style={styles.botonAudio}
                disabled={audioActivo}
              >
                {sonidosDisponibles[tipo].nombre}
              </button>
            ))}
            {audioActivo && (
              <button onClick={handleDetenerAudio} style={styles.botonDetener}>
                ⏹️ Detener
              </button>
            )}
          </div>
        ) : (
          <div style={styles.youtubeContainer}>
            <div style={styles.selectorVideo}>
              <label>Seleccionar video:</label>
              <select
                value={videoSeleccionado}
                onChange={(e) => setVideoSeleccionado(e.target.value)}
                style={styles.select}
              >
                {Object.keys(videosYouTube).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {videosYouTube[tipo].nombre}
                  </option>
                ))}
              </select>
            </div>
            <YouTube
              videoId={videosYouTube[videoSeleccionado].videoId}
              opts={{
                width: '100%',
                height: '315',
                playerVars: {
                  autoplay: 0,
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Contactos de Emergencia */}
      {configuracion && configuracion.contactosEmergencia && configuracion.contactosEmergencia.length > 0 && (
        <div style={styles.contactosCard}>
          <h3 style={styles.subtitulo}>📞 Contactos de Emergencia</h3>
          {configuracion.contactosEmergencia.map((contacto, index) => (
            <a key={index} href={`tel:${contacto}`} style={styles.botonLlamar}>
              📞 Llamar: {contacto}
            </a>
          ))}
        </div>
      )}

      {/* Historial Reciente */}
      <div style={styles.historialCard}>
        <h3 style={styles.subtitulo}>📋 Últimas 10 Lecturas</h3>
        <div style={styles.historialLista}>
          {historialReciente.map((lectura, index) => {
            const nivelLectura = getNivelPresion(lectura.presion);
            return (
              <div key={index} style={styles.historialItem}>
                <span style={styles.historialHora}>{lectura.hora}</span>
                <span style={{...styles.historialPresion, color: nivelLectura.color}}>
                  {nivelLectura.emoji} {lectura.presion}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  titulo: {
    color: '#2e7d32',
    margin: 0
  },
  codigoTag: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  alertaBanner: {
    backgroundColor: '#f44336',
    color: 'white',
    padding: '15px',
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    borderRadius: '8px',
    marginBottom: '20px',
    animation: 'pulse 1.5s infinite'
  },
  indicadorPrincipal: {
    padding: '40px',
    borderRadius: '15px',
    color: 'white',
    textAlign: 'center',
    marginBottom: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
  },
  presionDisplay: {
    marginBottom: '20px'
  },
  presionNumero: {
    fontSize: '120px',
    fontWeight: 'bold',
    lineHeight: '1'
  },
  presionLabel: {
    fontSize: '20px',
    letterSpacing: '2px',
    opacity: 0.9
  },
  nivelDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  nivelEmoji: {
    fontSize: '40px'
  },
  nivelTexto: {
    fontSize: '32px',
    fontWeight: 'bold',
    letterSpacing: '2px'
  },
  ultimaActualizacion: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '30px',
    fontSize: '14px'
  },
  audioControles: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  subtitulo: {
    color: '#388e3c',
    marginBottom: '15px',
    marginTop: 0
  },
  tipoReproduccion: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  botonTipo: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  botonesAudio: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px'
  },
  botonAudio: {
    padding: '12px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  botonDetener: {
    padding: '12px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    gridColumn: '1 / -1'
  },
  youtubeContainer: {
    marginTop: '15px'
  },
  selectorVideo: {
    marginBottom: '15px'
  },
  select: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    border: '2px solid #4caf50',
    borderRadius: '8px',
    marginTop: '5px'
  },
  contactosCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  botonLlamar: {
    display: 'block',
    padding: '15px',
    backgroundColor: '#f44336',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    marginBottom: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '18px'
  },
  historialCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  historialLista: {
    maxHeight: '300px',
    overflowY: 'auto'
  },
  historialItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px',
    borderBottom: '1px solid #eee'
  },
  historialHora: {
    color: '#666'
  },
  historialPresion: {
    fontWeight: 'bold',
    fontSize: '18px'
  },
  conectarCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    justifyContent: 'center'
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #4caf50',
    borderRadius: '8px',
    minWidth: '250px'
  },
  botonConectar: {
    padding: '12px 24px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default MonitoreoTiempoReal;
