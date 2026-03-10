import { useState } from 'react';
import { vincularPeluche, generarCodigoPeluche } from '../pelucheUtils';

const VincularPeluche = () => {
  const [codigoPeluche, setCodigoPeluche] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contacto1, setContacto1] = useState('');
  const [contacto2, setContacto2] = useState('');
  const [umbralAlerta, setUmbralAlerta] = useState(70);
  const [preferenciasSonido, setPreferenciasSonido] = useState('naturaleza');
  const [vinculado, setVinculado] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleGenerarCodigo = () => {
    const nuevoCodigo = generarCodigoPeluche();
    setCodigoPeluche(nuevoCodigo);
  };

  const handleVincular = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    if (!codigoPeluche.trim()) {
      setError('Por favor ingresa o genera un código de peluche');
      setCargando(false);
      return;
    }

    const configuracion = {
      nombreUsuario: nombreUsuario || 'Usuario',
      contactosEmergencia: [contacto1, contacto2].filter(c => c.trim() !== ''),
      umbralAlerta: parseInt(umbralAlerta),
      preferenciasSonido
    };

    const resultado = await vincularPeluche(codigoPeluche, configuracion);

    if (resultado.success) {
      setVinculado(true);
      // Guardar código en localStorage para acceso rápido
      localStorage.setItem('codigoPelucheActual', codigoPeluche);
      // también guardamos la configuración para poder reutilizarla si la API
      // se reinicia (las funciones de Vercel no mantienen memoria entre
      // invocaciones).  Esto hará que el monitoreo funcione aunque el
      // servidor pierda el dato.
      localStorage.setItem(
        `configuracion_${codigoPeluche}`,
        JSON.stringify(configuracion)
      );
    } else {
      setError(resultado.error || 'Error al vincular peluche');
    }

    setCargando(false);
  };

  if (vinculado) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <h2 style={styles.successTitle}>✅ ¡Peluche Vinculado Exitosamente!</h2>
          <div style={styles.codigoDisplay}>
            <p style={styles.codigoLabel}>Tu código de peluche:</p>
            <p style={styles.codigoTexto}>{codigoPeluche}</p>
          </div>
          <div style={styles.instrucciones}>
            <h3>📝 Próximos pasos:</h3>
            <ol style={styles.lista}>
              <li>Guarda este código en un lugar seguro</li>
              <li>Configura tu ESP32 con este código</li>
              <li>Ve a la sección "Monitoreo" para ver los datos en tiempo real</li>
              <li>Revisa el "Dashboard" para ver estadísticas</li>
            </ol>
          </div>
          <button
            onClick={() => {
              setVinculado(false);
              setCodigoPeluche('');
              setNombreUsuario('');
              setContacto1('');
              setContacto2('');
            }}
            style={styles.botonSecundario}
          >
            Vincular Otro Peluche
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>🦦 Vincular Mi Peluche</h2>

      <div style={styles.infoBox}>
        <p><strong>¿Qué es el código de peluche?</strong></p>
        <p>Es un identificador único que conecta tu peluche físico con esta aplicación web. Puedes generar un código nuevo o usar uno existente si ya tienes un peluche configurado.</p>
      </div>

      <form onSubmit={handleVincular} style={styles.form}>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Código del Peluche *</label>
          <div style={styles.inputGroup}>
            <input
              type="text"
              value={codigoPeluche}
              onChange={(e) => setCodigoPeluche(e.target.value.toUpperCase())}
              placeholder="NUTRIA-XXXXX"
              style={styles.input}
              required
            />
            <button
              type="button"
              onClick={handleGenerarCodigo}
              style={styles.botonGenerar}
            >
              🎲 Generar Código
            </button>
          </div>
          <small style={styles.helpText}>Genera un código nuevo o ingresa uno existente</small>
        </div>

        
        <div style={styles.formGroup}>
          <label style={styles.label}>Tu Nombre (opcional)</label>
          <input
            type="text"
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            placeholder="Ej: María"
            style={styles.input}
          />
        </div>

        
        <div style={styles.formGroup}>
          <label style={styles.label}>Contactos de Emergencia</label>
          <input
            type="tel"
            value={contacto1}
            onChange={(e) => setContacto1(e.target.value)}
            placeholder="Contacto 1: 614-XXX-XXXX"
            style={styles.input}
          />
          <input
            type="tel"
            value={contacto2}
            onChange={(e) => setContacto2(e.target.value)}
            placeholder="Contacto 2: 614-XXX-XXXX"
            style={{...styles.input, marginTop: '10px'}}
          />
          <small style={styles.helpText}>Números que se mostrarán durante una crisis</small>
        </div>

        {/* Umbral de Alerta */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Umbral de Alerta: {umbralAlerta}</label>
          <input
            type="range"
            min="50"
            max="100"
            value={umbralAlerta}
            onChange={(e) => setUmbralAlerta(e.target.value)}
            style={styles.slider}
          />
          <small style={styles.helpText}>Presión a partir de la cual se activa la alerta de crisis</small>
        </div>

        
        <div style={styles.formGroup}>
          <label style={styles.label}>Sonido Relajante Preferido</label>
          <select
            value={preferenciasSonido}
            onChange={(e) => setPreferenciasSonido(e.target.value)}
            style={styles.select}
          >
            <option value="naturaleza">🌲 Sonidos de Naturaleza</option>
            <option value="olas">🌊 Olas del Mar</option>
            <option value="respiracion">🧘 Guía de Respiración</option>
            <option value="musica">🎵 Música Instrumental</option>
          </select>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          type="submit"
          disabled={cargando}
          style={{...styles.botonPrincipal, opacity: cargando ? 0.6 : 1}}
        >
          {cargando ? '⏳ Vinculando...' : '✅ Vincular Peluche'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px'
  },
  titulo: {
    color: '#2e7d32',
    borderBottom: '2px solid #c8e6c9',
    paddingBottom: '10px',
    marginBottom: '20px'
  },
  infoBox: {
    backgroundColor: '#e8f5e9',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #4caf50'
  },
  form: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#2e7d32'
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #4caf50',
    borderRadius: '8px',
    boxSizing: 'border-box'
  },
  inputGroup: {
    display: 'flex',
    gap: '10px'
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #4caf50',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '5px',
    outline: 'none'
  },
  helpText: {
    display: 'block',
    marginTop: '5px',
    color: '#666',
    fontSize: '14px'
  },
  botonGenerar: {
    padding: '12px 20px',
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  botonPrincipal: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  botonSecundario: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px'
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '15px',
    border: '1px solid #ef5350'
  },
  successCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  successTitle: {
    color: '#4caf50',
    marginBottom: '20px'
  },
  codigoDisplay: {
    backgroundColor: '#e8f5e9',
    padding: '20px',
    borderRadius: '10px',
    margin: '20px 0',
    border: '2px solid #4caf50'
  },
  codigoLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '5px'
  },
  codigoTexto: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2e7d32',
    margin: '0',
    letterSpacing: '2px'
  },
  instrucciones: {
    textAlign: 'left',
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px'
  },
  lista: {
    lineHeight: '2'
  }
};

export default VincularPeluche;
