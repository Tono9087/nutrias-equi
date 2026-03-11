# 🦦 ANÁLISIS COMPLETO: NUTRIAS EN EQUILIBRIO

**Sistema Integral de Detección de Crisis de Ansiedad con IoT**

---

## 📋 TABLA DE CONTENIDOS

1. [Descripción General](#1-descripción-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Sistema ESP32 - Código Python](#3-sistema-esp32---código-python)
4. [Sistema Backend - JavaScript/Vercel](#4-sistema-backend---javascriptvercel)
5. [Frontend - React](#5-frontend---react)
6. [Flujos de Datos](#6-flujos-de-datos)
7. [Estilización y Diseño](#7-estilización-y-diseño)
8. [Seguridad y Validaciones](#8-seguridad-y-validaciones)
9. [Package.json](#9-packagejson)
10. [Flujo de Usuario Completo](#10-flujo-de-usuario-completo)
11. [Características Principales](#11-características-principales)

---

## 1. DESCRIPCIÓN GENERAL

**Nutrias en Equilibrio** es un **sistema integrado de IoT** para detectar y alertar sobre crisis de ansiedad a través de un peluche inteligente equipado con un sensor de presión (FSR - Force Sensitive Resistor).

### Componentes Principales:
- **Hardware**: ESP32 + Sensor FSR402
- **Firmware**: MicroPython
- **Backend**: Vercel Serverless Functions
- **Frontend**: React 19.2.0
- **Comunicación**: HTTP + SSE (Server-Sent Events)

---

## 2. ARQUITECTURA DEL SISTEMA

```
┌─────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  ESP32 FÍSICO   │◄──────►│  VERCEL API      │◄──────►│  REACT FRONTEND  │
│ (Sensor FSR)    │ HTTP   │  (Serverless)    │ HTTP   │  (Web Browser)   │
└─────────────────┘        └──────────────────┘        └──────────────────┘
     MicroPython           Node.js Functions          React 19.2.0
     
     ↓ Cada 0.1s           ↓ EventEmitter             ↓ SSE + localStorage
   Lee sensor             Almacena en memoria       Visualiza en tiempo real
```

### Flujo de datos:
1. ESP32 lee presión del sensor continuamente
2. Transmite a API Vercel cada 0.1 segundos
3. Frontend React se suscribe vía SSE
4. Actualización en tiempo real sin refresh

---

## 3. SISTEMA ESP32 - CÓDIGO PYTHON

### 3.1 [boot(1).py](boot(1).py) - Inicialización

Se ejecuta automáticamente al encender el ESP32:

```python
import gc
import esp

# Deshabilitar debug para ahorrar memoria
esp.osdebug(None)

# Recolección de basura
gc.collect()

print('Peluche Anti-Ansiedad v1.0')
print('ESP32 con MicroPython')
```

**Propósito**: Liberación de recursos y configuración inicial del sistema.

---

### 3.2 [config(1).py](config(1).py) - Configuración Centralizada

Archivo de configuración que define todos los parámetros del sistema:

#### Identificación del Peluche
```python
PELUCHE_ID = 'NUTRIA-000000'        # Formato: NUTRIA-XXXXXX (6 caracteres)
PELUCHE_NOMBRE = 'Nutria de Tono'  # Nombre personalizado
```

#### Credenciales WiFi
```python
WIFI_SSID = 'mis-red-wifi'        # Nombre de la red
WIFI_PASSWORD = 'mi_contraseña_segura'  # Contraseña
```

#### Configuración del Sensor
```python
PIN_SENSOR = 34  # GPIO34 para lectura analógica
INTERVALO_LECTURA = 0.1  # Frecuencia de muestreo (segundos)
```

#### Umbrales de Ansiedad (en porcentaje 0-100%)
```python
UMBRAL_NORMAL = 30   # 0-30%: Usuario tranquilo
UMBRAL_ALERTA = 60   # 30-60%: Inicio de ansiedad
UMBRAL_CRISIS = 80   # 60-80%: Ansiedad moderada
                     # 80-100%: Crisis de ansiedad
```

#### Backend/Nube
```python
PUERTO_API = 80
BACKEND_URL = 'https://nutrias-equilibrio.vercel.app'
```

---

### 3.3 [main.py](main.py) - Script Principal (252 líneas)

#### Librerías Utilizadas
```python
from machine import ADC, Pin    # Control de GPIO y conversión analógica
import network                   # Configuración WiFi (STA/AP)
import socket                    # Servidor HTTP
import json                      # Serialización JSON
import time                      # Manejo de tiempos
import urequests (opcional)     # Requests HTTP a backend
from config import *            # Importar configuración centralizada
```

#### Función 1: `leer_presion()`
Lee el sensor analógico y convierte a porcentaje:

```python
def leer_presion():
    """Lee el valor del sensor y lo convierte a porcentaje (0-100%)"""
    valor = sensor.read()           # Lee ADC (0-4095 en 12 bits)
    presion = int((valor / 4095) * 100)  # Convierte a %
    return presion

# Configuración del ADC:
sensor = ADC(Pin(34))
sensor.atten(ADC.ATTN_11DB)    # Rango completo 0-3.3V
sensor.width(ADC.WIDTH_12BIT)  # Resolución de 12 bits
```

#### Función 2: `detectar_estado(presion)`
Clasifica la presión en 4 niveles de ansiedad:

```python
def detectar_estado(presion):
    """Determina el estado de ansiedad según la presión ejercida"""
    if presion < UMBRAL_NORMAL:  # < 30%
        return {
            "estado": "tranquilo",
            "nivel": 0,
            "descripcion": "Usuario tranquilo"
        }
    elif presion < UMBRAL_ALERTA:  # 30-60%
        return {
            "estado": "leve",
            "nivel": 1,
            "descripcion": "Tensión leve detectada"
        }
    elif presion < UMBRAL_CRISIS:  # 60-80%
        return {
            "estado": "moderado",
            "nivel": 2,
            "descripcion": "Ansiedad moderada"
        }
    else:  # >= 80%
        return {
            "estado": "crisis",
            "nivel": 3,
            "descripcion": "Posible crisis de ansiedad"
        }
```

#### Función 3: `conectar_wifi()`
Conecta el ESP32 a la red WiFi con reintentos automáticos:

**Proceso:**
1. Desactiva modo AP (Access Point)
2. Activa modo STA (Station)
3. Intenta conectar con SSID/Password de config
4. Reintento automático si falla (máx 2 intentos)
5. Timeout de 20 segundos por intento (10 segundos total × 2)
6. Retorna objeto WiFi o None

**Salida de debug:**
```
Conectando a WiFi...
. . . . . .
WiFi conectado!
IP: 192.168.1.100
Máscara: 255.255.255.0
Gateway: 192.168.1.1
```

#### Función 4: `iniciar_servidor()`
Abre un servidor HTTP en puerto 80:

```python
def iniciar_servidor():
    """Inicia el servidor HTTP para la API"""
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('0.0.0.0', PUERTO_API))
    s.listen(1)
    return s
```

Permite consultas locales a la API del peluche.

#### Función 5: `generar_respuesta_http(datos)`
Genera respuesta HTTP 200 OK con headers CORS:

```python
response = """HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: GET, OPTIONS
Connection: close

{JSON_BODY}"""
```

#### Loop Principal
Ejecuta continuamente después de inicialización:

```python
while True:
    try:
        # 1. Aceptar conexión HTTP
        cliente, direccion = servidor.accept()
        
        # 2. Leer request del cliente
        request = cliente.recv(1024)
        
        # 3. Leer presión del sensor
        presion = leer_presion()
        estado_info = detectar_estado(presion)
        
        # 4. Preparar JSON con datos
        datos = {
            'peluche_id': PELUCHE_ID,
            'peluche_nombre': PELUCHE_NOMBRE,
            'presion': presion,
            'estado': estado_info['estado'],
            'nivel': estado_info['nivel'],
            'descripcion': estado_info['descripcion'],
            'timestamp': time.time()
        }
        
        # 5. Enviar respuesta local
        respuesta = generar_respuesta_http(datos)
        cliente.send(respuesta.encode())
        
        # 6. Enviar a backend en la nube (si disponible)
        if urequests and BACKEND_URL:
            try:
                url = BACKEND_URL + '/api/sensor-data'
                resp = urequests.post(url, 
                    data=json.dumps(datos), 
                    headers={'Content-Type': 'application/json'}
                )
                resp.close()
            except Exception as e:
                print('Error enviando a nube:', e)
        
        # 7. Cerrar conexión
        cliente.close()
        
        # 8. Debug
        print(f'[{PELUCHE_ID}] Presión: {presion}% | Estado: {estado_info["estado"]}')
        
    except Exception as e:
        print('Error:', e)
```

**Características del loop:**
- Acepta conexión cada vez que hay petición
- Procesa lectura de sensor
- Envía al backend sin bloquear (best effort)
- Manejo robusto de excepciones
- Debug de cada lectura importante

---

## 4. SISTEMA BACKEND - JAVASCRIPT/VERCEL

### 4.1 [api/storage.js](api/storage.js) - Almacenamiento en Memoria

Gestiona los datos usando EventEmitter para notificaciones en tiempo real:

```javascript
import EventEmitter from 'events';

const peluches = {};      // { [pelucheId]: configuración }
const lecturas = {};      // { [pelucheId]: [lectura, ...] }
const emitter = new EventEmitter();
```

#### Funciones de Peluches
```javascript
getPeluche(id)              // Obtiene configuración guardada
addPeluche(id, config)      // Crea/actualiza peluche
```

#### Funciones de Lecturas
```javascript
getLecturas(id)             // Retorna array de todas las lecturas
getLatestLectura(id)        // Última lectura
addLectura(id, lectura)     // Agrega + emite evento SSE
```

#### Sistema de Eventos
```javascript
onNewLectura(id, callback)  // Suscribirse a nuevas lecturas
removeLecturaListener(id, cb) // Desuscribirse
```

Usa EventEmitter para implementar SSE sin base de datos.

---

### 4.2 [api/sensor-data.js](api/sensor-data.js) - Recibir Datos del Sensor

**Endpoint**: `POST /api/sensor-data`

**Request esperado:**
```json
{
  "pelucheId": "NUTRIA-ABC123",
  "presion": 45
}
```

**Validaciones:**
1. Formato de código: `^NUTRIA-[A-Z0-9]{6}$`
2. Presión: número entre 0 y 100
3. Presión mínima para guardar: >= 30 (filtra ruido)
4. Peluche debe existir (vinculado previamente)

**Respuesta de éxito:**
```json
{
  "success": true,
  "message": "Lectura guardada correctamente (categoría alta >= 30)",
  "data": {
    "pelucheId": "NUTRIA-ABC123",
    "porcentaje": 45,
    "umbral": 30,
    "guardado": true,
    "timestamp": "2026-03-10T14:30:00Z"
  }
}
```

**Respuesta si presión < 30:**
```json
{
  "success": true,
  "message": "Lectura descartada: no alcanza categoría alta",
  "data": {
    "pelucheId": "NUTRIA-ABC123",
    "porcentaje": 15,
    "umbral": 30,
    "guardado": false
  }
}
```

**Errores posibles:**
- 400: Código inválido o presión fuera de rango
- 404: Peluche no encontrado (no vinculado)
- 500: Error del servidor

**CORS:** Habilitado para todas las direcciones

---

### 4.3 [api/peluches/index.js](api/peluches/index.js) - Gestión de Peluches

**Endpoint**: `POST /api/peluches`

**Request:**
```json
{
  "codigo": "NUTRIA-ABC123",
  "configuracion": {
    "nombreUsuario": "María",
    "contactosEmergencia": ["614-1234567", "614-7654321"],
    "umbralAlerta": 70,
    "preferenciasSonido": "naturaleza"
  }
}
```

**Almacena:**
```javascript
{
  nombreUsuario: "María",
  contactosEmergencia: ["614-1234567", "614-7654321"],
  umbralAlerta: 70,
  preferenciasSonido: "naturaleza",
  fechaVinculacion: "2026-03-10T14:30:00Z",
  activo: true,
  codigo: "NUTRIA-ABC123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "nombreUsuario": "María",
    "contactosEmergencia": [...],
    "umbralAlerta": 70,
    "preferenciasSonido": "naturaleza",
    "fechaVinculacion": "...",
    "activo": true,
    "codigo": "NUTRIA-ABC123"
  }
}
```

---

### 4.4 [api/peluches/{id} (GET)](api/peluches/[id].js)

**Endpoint**: `GET /api/peluches/{pelucheId}`

Retorna configuración completa del peluche:

```json
{
  "success": true,
  "data": {
    "nombreUsuario": "María",
    "contactosEmergencia": ["614-1234567"],
    "umbralAlerta": 70,
    "preferenciasSonido": "naturaleza",
    "fechaVinculacion": "2026-03-10T14:30:00Z",
    "activo": true
  }
}
```

Si no existe: `{ "success": false, "error": "..." }`

---

### 4.5 [api/lecturas/[id].js](api/lecturas/[id].js) - Consultar Datos Históricos

**Endpoint**: `GET /api/lecturas/{pelucheId}?limit=100`

**Query parameters:**
- `limit`: número máximo de lecturas a retornar (0 = todas)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "presion": 45,
      "timestamp": "2026-03-10T14:30:00Z",
      "fecha": "10/03/2026",
      "hora": "14:30:00"
    },
    {
      "presion": 65,
      "timestamp": "2026-03-10T14:30:15Z",
      "fecha": "10/03/2026",
      "hora": "14:30:15"
    }
  ]
}
```

Retorna array vacío si no hay lecturas.

---

### 4.6 [api/monitor/[id].js](api/monitor/[id].js) - Server-Sent Events (SSE)

**Endpoint**: `GET /api/monitor/{pelucheId}`

Abre conexión SSE para recibir actualizaciones en tiempo real:

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Formato de datos:**
```
data: {"presion": 75, "timestamp": "...", "fecha": "10/03/2026", "hora": "14:30:00"}

data: {"presion": 82, "timestamp": "...", "fecha": "10/03/2026", "hora": "14:30:15"}
```

**Cliente JavaScript:**
```javascript
const src = new EventSource('/api/monitor/NUTRIA-ABC123');
src.onmessage = (e) => {
  const lectura = JSON.parse(e.data);
  console.log('Nueva lectura:', lectura);
};
```

---

## 5. FRONTEND - REACT

### 5.1 Dependencias (package.json)

```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "react-scripts": "5.0.1",
  "recharts": "2.10.3",              // Gráficas y visualización
  "react-youtube": "10.1.0",         // Videos embebidos
  "web-vitals": "2.1.4",             // Métricas de rendimiento
  "@testing-library/react": "16.3.0",
  "@testing-library/jest-dom": "6.9.1"
}
```

---

### 5.2 [src/App.js](src/App.js) - Componente Principal (1327 líneas)

Organización del componente:

#### Header
- Logo y título principal
- Navegación con 6 pestañas principales
- Estilo verde (#4caf50)

#### Pestañas Principales

1. **🦦 Vincular Mi Peluche**
   - Generar código único
   - Configuración de usuario
   - Contactos de emergencia
   - Guardado en localStorage

2. **🎛️ Monitoreo en Tiempo Real**
   - Indicador de presión con código de colores
   - Histórico de últimas 10 lecturas
   - Actualizaciones vía SSE
   - Reproducción automática de sonidos

3. **📊 Dashboard de Datos**
   - Gráficas históricas (Recharts)
   - Estadísticas diarias
   - Puntos de alerta
   - Análisis de tendencias

4. **🎵 Sonidos Relajantes**
   - Reproductor de audio local
   - Integración YouTube
   - Control de volumen
   - Autoplay en crisis

5. **ℹ️ Centro de Información**
   - 11 centros psicológicos en Chihuahua
   - Información sobre trastornos mentales
   - Mapas embebidos con Google Maps
   - Horarios y servicios

6. **📝 Encuesta**
   - Formulario de feedback
   - 4 preguntas + comentarios
   - Validación de respuestas
   - Confirmación visual

#### Paleta de Colores
```javascript
Verde principal:    #4caf50   // RGB(76, 175, 80)
Verde oscuro:       #2e7d32   // Botones
Verde claro:        #e8f5e9   // Fondos
Blanco:             #ffffff   // Contenido
Rojo (crisis):      #f44336   // Alertas nivel 3
Naranja (alerta):   #ff9800   // Alertas nivel 2
```

#### Layout
- **Header**: Full width, 20px padding
- **NavBar**: Flex, centered, wrap enabled
- **Content**: max-width 1200px, margin auto
- **Main**: 60% width, padding 20px
- **Sidebar**: 40% width, verde claro

---

### 5.3 [src/components/VincularPeluche.js](src/components/VincularPeluche.js)

Componente para vincular un peluche físico con la aplicación web.

**Estados del componente:**
```javascript
const [codigoPeluche, setCodigoPeluche] = useState('')
const [nombreUsuario, setNombreUsuario] = useState('')
const [contacto1, setContacto1] = useState('')
const [contacto2, setContacto2] = useState('')
const [umbralAlerta, setUmbralAlerta] = useState(70)
const [preferenciasSonido, setPreferenciasSonido] = useState('naturaleza')
const [vinculado, setVinculado] = useState(false)
const [error, setError] = useState('')
const [cargando, setCargando] = useState(false)
```

**Flujo:**

1. **Generar código**: Click en botón "🎲 Generar Código"
   - Genera NUTRIA- + 6 caracteres aleatorios

2. **Ingreso manual**: Usuario puede ingresar código existente

3. **Configuración:**
   - Nombre del usuario (opcional)
   - 2 contactos de emergencia
   - Umbral de alerta (0-100, default 70)
   - Preferencia de sonido (naturaleza, olas, respiracion, musica)

4. **Validación:**
   - Código no vacío
   - Formato NUTRIA-XXXXXX

5. **Guardado:**
   - POST /api/peluches
   - localStorage: codigoPelucheActual
   - localStorage: configuracion_{codigo}

6. **Confirmación:**
   - Mostrar código con instrucciones
   - Botón para vincular otro peluche

---

### 5.4 [src/components/MonitoreoTiempoReal.js](src/components/MonitoreoTiempoReal.js) (500 líneas)

Componente principal de monitoreo en vivo.

**Estados:**
```javascript
const [codigoPeluche, setCodigoPeluche] = useState('')
const [presionActual, setPresionActual] = useState(0)
const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
const [configuracion, setConfiguracion] = useState(null)
const [conectado, setConectado] = useState(false)
const [historialReciente, setHistorialReciente] = useState([])
const [mostrarAlerta, setMostrarAlerta] = useState(false)
const [audioActivo, setAudioActivo] = useState(false)
const [tipoReproduccion, setTipoReproduccion] = useState('audio')
const [videoSeleccionado, setVideoSeleccionado] = useState('respiracion')
```

**Indicador Visual de Presión:**

```
Rango          Color     Emoji  Estado   Acción
─────────────────────────────────────────────────
0-49 (< 50%)   VERDE    🟢    CALMA    Ninguna
50-69 (50-69%) NARANJA  🟡    ATENCIÓN Notificación
70+ (≥ 70%)    ROJO     🔴    CRISIS   Sonido + Alerta
```

**Flujo de inicialización:**

```
1. useEffect: Carga código guardado de localStorage
2. iniciarMonitoreo():
   a. GET /api/peluches/{codigo} → obtener configuración
   b. Si falla → usar localStorage como fallback
   c. GET /api/lecturas/{codigo}?limit=10 → últimas 10
   d. EventSource /api/monitor/{codigo} → escuchar cambios
3. onmessage: Cada nueva lectura
   a. setPresionActual()
   b. Si presión >= umbral: reproducir sonido
   c. Agregar a historial (máx 10 items)
```

**Controles:**

- **Conectar**: Ingresa código + click conectar
- **Audio Local**: Botones para cada sonido
- **YouTube**: Dropdown con videos
- **Detener**: Pausa reproducción

---

### 5.5 [src/soundManager.js](src/soundManager.js)

Gestor de reproducción de audio.

**Sonidos Locales (archivos):**

```javascript
{
  naturaleza: {
    nombre: 'Sonidos de Naturaleza',
    descripcion: 'Lluvia, pájaros y río',
    archivo: '/sounds/birds-339196.mp3',
    duracion: 300
  },
  olas: {
    nombre: 'Olas del Mar',
    descripcion: 'Olas suaves en la playa',
    archivo: '/sounds/olas.mp3',
    duracion: 300
  },
  respiracion: {
    nombre: 'Guía de Respiración',
    descripcion: 'Ejercicio 4-7-8',
    archivo: '/sounds/respiracion.mp3',
    duracion: 180
  },
  musica: {
    nombre: 'Música Instrumental',
    descripcion: 'Piano relajante',
    archivo: '/sounds/piano.mp3',
    duracion: 600
  }
}
```

**Videos YouTube:**

```javascript
{
  respiracion: {
    nombre: 'Ejercicio de Respiración Guiada',
    videoId: 'SEfs5TJZ6Nk',
    duracion: 300
  },
  naturaleza: {
    nombre: 'Sonidos de Bosque - 1 hora',
    videoId: '3QlPppPsnYw',
    duracion: 3600
  },
  meditacion: {
    nombre: 'Meditación para Ansiedad - 10 min',
    videoId: 'O-6f5wQXSu8',
    duracion: 600
  },
  lluvia: {
    nombre: 'Sonido de Lluvia - 30 min',
    videoId: 'q76bMs-NwRk',
    duracion: 1800
  }
}
```

**Clase AudioManager:**

```javascript
class AudioManager {
  constructor() {
    this.audioActual = null
    this.estaReproduciendo = false
  }
  
  reproducir(tipoSonido) {
    // Detiene audio anterior
    // Crea nuevo Audio()
    // Configure: loop = true, volume = 0.7
    // Play() con manejo de Promise
  }
  
  detener() {
    // Pausa
    // Reset currentTime = 0
    // Limpia referencia
  }
}
```

---

### 5.6 [src/pelucheUtils.js](src/pelucheUtils.js) (180+ líneas)

Utilidades de API y gestión de datos.

#### 1. Generador de Código
```javascript
export const generarCodigoPeluche = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let codigo = 'NUTRIA-'
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length))
  }
  return codigo  // Ej: NUTRIA-ABC123
}
```

#### 2. Vincular Peluche
```javascript
export const vincularPeluche = async (codigoPeluche, configuracion) => {
  const resp = await fetch('/api/peluches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo: codigoPeluche, configuracion })
  })
  const data = await resp.json()
  return { success: data.success, codigo: codigoPeluche }
}
```

#### 3. Obtener Configuración
```javascript
export const obtenerConfiguracionPeluche = async (codigoPeluche) => {
  const resp = await fetch(`/api/peluches/${codigoPeluche}`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()
  return data
}
```

Con fallback a localStorage si falla.

#### 4. Guardar Lectura del Sensor
```javascript
export const guardarLecturaSensor = async (codigoPeluche, presion) => {
  const resp = await fetch('/api/sensor-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pelucheId: codigoPeluche, presion })
  })
  return await resp.json()
}
```

#### 5. Obtener Lecturas Recientes
```javascript
export const obtenerLecturasRecientes = async (codigoPeluche, limite = 100) => {
  const resp = await fetch(`/api/lecturas/${codigoPeluche}?limit=${limite}`)
  return await resp.json()
}
```

#### 6. Escuchar en Tiempo Real (SSE)
```javascript
export const escucharLecturasEnTiempoReal = (codigoPeluche, callback) => {
  const src = new EventSource(`/api/monitor/${codigoPeluche}`)
  src.onmessage = (e) => {
    const lectura = JSON.parse(e.data)
    callback(lectura)
  }
  return () => src.close()  // Función para desuscribirse
}
```

#### 7. Estadísticas del Día
```javascript
export const obtenerEstadisticasDia = async (codigoPeluche) => {
  const lecturas = await obtenerLecturasRecientes(codigoPeluche, 1000)
  const hoy = new Date().toLocaleDateString('es-MX')
  const lecturasHoy = lecturas.data.filter(l => l.fecha === hoy)
  
  return {
    success: true,
    data: {
      totalLecturas: lecturasHoy.length,
      presionMaxima: Math.max(...presiones),
      presionPromedio: promedio.toFixed(1),
      totalAlertas: lecturasHoy.filter(l => l.presion >= 70).length,
      lecturas: lecturasHoy
    }
  }
}
```

---

## 6. FLUJOS DE DATOS

### Flujo 1: Lectura de Sensor (Tiempo Real)

```
ESP32: cada 0.1 segundos
  ↓
1. Lee GPIO34 (FSR) → valor 0-4095
  ↓
2. Convierte a % → (valor / 4095) * 100
  ↓
3. Detecta estado (tranquilo/leve/moderado/crisis)
  ↓
4. Crea JSON:
   {
     peluche_id: "NUTRIA-ABC123",
     presion: 45,
     estado: "leve",
     timestamp: 1741610400.0
   }
  ↓
5. Envía a POST /api/sensor-data
  ↓
6. Backend valida:
   • Código formato NUTRIA-XXXXXX
   • Presión entre 0-100
   • Presión >= 30 (filtra ruido)
   • Peluche existe
  ↓
7. Guarda en memoria si válido
  ↓
8. Emite evento SSE
  ↓
Front-end recibe vía EventSource y actualiza UI
```

### Flujo 2: Vinculación de Peluche

```
Usuario en web
  ↓
1. Click en "Vincular Mi Peluche"
  ↓
2. Genera código o ingresa existente
   → NUTRIA-ABC123
  ↓
3. Ingresa datos:
   • Nombre (opcional)
   • Contactos (2)
   • Umbral alerta (70)
   • Preferencia sonido (naturaleza)
  ↓
4. Click "Vincular"
  ↓
5. POST /api/peluches:
   {
     codigo: "NUTRIA-ABC123",
     configuracion: {
       nombreUsuario: "María",
       contactosEmergencia: ["614-1234567"],
       umbralAlerta: 70,
       preferenciasSonido: "naturaleza"
     }
   }
  ↓
6. Backend guarda en memoria:
   peluches["NUTRIA-ABC123"] = { ... }
  ↓
7. Frontend guarda en localStorage:
   codigoPelucheActual = "NUTRIA-ABC123"
   configuracion_NUTRIA-ABC123 = {...}
  ↓
8. Mostrar confirmación con código
  ↓
Usuario escribe código en config.py del ESP32
```

### Flujo 3: Monitoreo en Tiempo Real

```
Usuario en "Monitoreo"
  ↓
1. Ingresa código: NUTRIA-ABC123
  ↓
2. Frontend:
   a. GET /api/peluches/NUTRIA-ABC123
      → obtener configuración (umbral, sonidos, etc)
   b. Si 404 → usar localStorage como fallback
   c. GET /api/lecturas/NUTRIA-ABC123?limit=10
      → obtener últimas 10 lecturas
   d. EventSource /api/monitor/NUTRIA-ABC123
      → abre streaming SSE
  ↓
3. Backend:
   • onNewLectura(id, callback) escucha eventos
   • emitter emite cada lectura nueva que llega
  ↓
4. Cada lectura en tiempo real:
   • Frontend receibe vía SSE
   • setPresionActual(lectura.presion)
   • Si presion >= umbralAlerta:
     - reproducir sonido automático
     - mostrar alerta en banner rojo
   • Agregar a historial (máx 10)
  ↓
5. Indicador visual:
   🟢 VERDE    (0-49%)
   🟡 AMARILLO (50-69%)
   🔴 ROJO     (70%+)
  ↓
6. Mostrar info:
   • Presión actual
   • Última actualización (timestamp)
   • Últimas 10 lecturas en tabla
   • Gráfica histórica (si disponible)
```

### Flujo 4: Crisis Detectada

```
Presión >= umbralAlerta (ej: 70%)
  ↓
1. Frontend detecta:
   if (presionActual >= configuracion.umbralAlerta)
  ↓
2. Acciones inmediatas:
   a. mostrarAlerta = true
      → Mostrar banner rojo: 🚨 ALERTA DE CRISIS
   b. gestorAudio.reproducir(preferenciasSonido)
      → Reproducir sonido automático
   c. Puede reproducir video YouTube también
  ↓
3. Usuario ve:
   • Indicador ROJO 🔴
   • Banner de alerta parpadeante
   • Audio/video relajante reproduciéndose
   • Botones de contacto de emergencia
  ↓
4. Usuario puede:
   • Escuchar sonidos más tiempo
   • Hacer ejercicio de respiración
   • Contactar a números de emergencia
   • Ver recursos en "Centro de Información"
```

---

## 7. ESTILIZACIÓN Y DISEÑO

### Paleta de Colores

| Elemento | Color | RGB | Uso |
|----------|-------|-----|-----|
| Verde principal | #4caf50 | (76,175,80) | Headers, botones principales |
| Verde oscuro | #2e7d32 | Botones, hover |
| Verde claro | #e8f5e9 | Fondos, sidebars |
| Blanco | #ffffff | Contenido principal |
| Rojo (Crisis) | #f44336 | Alertas de crisis (≥70%) |
| Naranja (Alerta) | #ff9800 | Alertas de atención (50-69%) |
| Texto principal | #2d5016 | Textos sobre fondos claros |

### Componentes Visuales

**Cards:**
- Padding: 15px
- Border-radius: 8px
- Box-shadow: 0 2px 10px rgba(0,0,0,0.1)
- Transición: 0.3s ease

**Botones:**
- Padding: 12px 20px
- Border-radius: 5px
- Font-size: 16px
- Cursor: pointer
- Hover: cambio de color suave

**Inputs:**
- Padding: 10px
- Font-size: 16px
- Border: 2px solid #c8e6c9
- Border-radius: 5px

**Layout Desktop:**
- Max-width: 1200px
- Contenido: 60%
- Sidebar: 40%
- Margin auto

### Fuentes
```
Font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
Line-height: 1.6
```

---

## 8. SEGURIDAD Y VALIDACIONES

### Validación de Código de Peluche

**Regex:** `^NUTRIA-[A-Z0-9]{6}$`

```
✅ Válidos:
   NUTRIA-ABC123
   NUTRIA-00F9Z7
   NUTRIA-XXXXXX

❌ Inválidos:
   NUTRIA-abc123      (minúsculas)
   NUTRIA_ABC123      (guión bajo)
   NUTRIA-ABCDE       (5 caracteres)
   nutria-ABC123      (minúscula al inicio)
```

### Validación de Presión

```javascript
const validarPresion = (presion) => {
  const num = Number(presion)
  return !isNaN(num) && num >= 0 && num <= 100
}
```

- Tipo: número
- Rango: 0-100
- Obtenido de: conversión ADC 12-bit

### Filtrado de Lecturero

```
Solo guarda: presion >= 30
Descarta: presion < 30 (considera ruido)
```

### CORS
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Permite solicitudes desde cualquier origen.

### Manejo de Errores HTTP

| Código | Significado | Causa |
|--------|------------|-------|
| 200 | OK | Éxito |
| 400 | Bad Request | Datos inválidos o falta datos |
| 404 | Not Found | Peluche no vinculado |
| 405 | Method Not Allowed | GET en endpoint POST |
| 500 | Server Error | Error interno del servidor |

### Persistencia Local (Fallback)

Si el servidor falla, React usa:
```javascript
localStorage.getItem('codigoPelucheActual')
localStorage.getItem(`configuracion_${codigo}`)
```

Permite continuar monitoreando incluso sin backend.

---

## 9. Package.json

```json
{
  "name": "nutrias-equilibrio",
  "version": "0.1.0",
  "private": true,
  
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-scripts": "5.0.1",
    "react-youtube": "^10.1.0",
    "recharts": "^2.10.3",
    "web-vitals": "^2.1.4",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/user-event": "^13.5.0",
    "@testing-library/dom": "^10.4.1"
  },
  
  "scripts": {
    "start": "react-scripts start",           // Dev: http://localhost:3000
    "build": "react-scripts build",          // Producción
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"            // Deploy a GitHub Pages
  },
  
  "eslintConfig": {
    "extends": ["react-app", "react-app/jest"]
  },
  
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  
  "devDependencies": {
    "gh-pages": "^6.3.0"
  }
}
```

### Scripts principales

- `npm start` → Inicia servidor de desarrollo
- `npm run build` → Genera build para producción
- `npm run deploy` → Publica en GitHub Pages
- `npm test` → Ejecuta tests

---

## 10. FLUJO DE USUARIO COMPLETO

### Escenario: Usuario Nuevo

```
1. INSTALACIÓN FÍSICA
   ├─ Compra ESP32 + sensor FSR402
   ├─ Carga boot.py
   ├─ Carga config.py (con PELUCHE_ID = NUTRIA-000000)
   ├─ Carga main.py
   └─ Conecta sensor a GPIO34

2. ABRE APLICACIÓN WEB
   ├─ Va a https://nutrias-equilibrio.vercel.app
   └─ Ve navegación con 6 pestañas

3. VINCULAR PELUCHE
   ├─ Click en "🦦 Vincular Mi Peluche"
   ├─ Click en "🎲 Generar Código"
   │  └─ Genera: NUTRIA-ABC123
   ├─ Ingresa:
   │  ├─ Nombre: "María"
   │  ├─ Contacto 1: "614-1234567"
   │  ├─ Umbral alerta: 70
   │  └─ Preferencia: "naturaleza"
   ├─ Click "Vincular"
   ├─ Backend guarda en memoria
   ├─ Frontend guarda en localStorage
   └─ Mostrar: "✅ ¡Peluche Vinculado!"

4. CONFIGURAR ESP32
   ├─ Abre config.py en editor
   ├─ Cambia PELUCHE_ID = 'NUTRIA-ABC123'
   ├─ Ingresa WIFI_SSID y WIFI_PASSWORD
   ├─ Guarda y recarga ESP32
   └─ EL ESP32 comienza a enviar datos

5. MONITOREO EN TIEMPO REAL
   ├─ Click en "🎛️ Monitoreo en Tiempo Real"
   ├─ Ingresa código: NUTRIA-ABC123
   ├─ Click "🔌 Conectar"
   ├─ Frontend:
   │  ├─ Obtiene configuración
   │  ├─ Carga últimas 10 lecturas
   │  └─ Abre conexión SSE
   ├─ Muestra:
   │  ├─ Indicador de presión actual
   │  ├─ 🟢 VERDE (presión baja)
   │  ├─ Historial de 10 lecturas
   │  └─ Momento de última actualización
   └─ Usuario presiona el peluche
      ├─ ESP32 detecta: presion = 45%
      ├─ Envía a /api/sensor-data
      ├─ Backend recibe y guarda
      ├─ Emite evento SSE
      ├─ Frontend recibe en tiempo real
      ├─ Actualiza indicador a 45
      └─ Agrega a historial

6. CRISIS DETECTADA
   ├─ Usuario presiona fuerte
   ├─ Presión = 75%
   ├─ Frontend detecta >= 70
   └─ Acciones automáticas:
      ├─ 🔴 Indicador se pone ROJO
      ├─ 🚨 Banner de alerta parpadeante
      ├─ 🎵 Reproducir sonido "naturaleza"
      ├─ 🎬 Opción reproducir video YouTube
      ├─ 📞 Mostrar contactos de emergencia
      └─ 💡 Recursos de apoyo visibles

7. ACCEDER A RECURSOS
   ├─ Click en "ℹ️ Centro de Información"
   └─ Ve:
      ├─ 11 centros psicológicos con mapas
      ├─ Información sobre trastornos
      ├─ Guía de manejo de crisis
      └─ Números de emergencia

8. FEEDBACK
   ├─ Click en "📝 Encuesta"
   ├─ Completa 4 preguntas + comentarios
   ├─ Click "Enviar Encuesta"
   └─ Ver confirmación: "✅ Gracias por tu respuesta!"

9. VER ESTADÍSTICAS (Dashboard)
   ├─ Click en "📊 Dashboard de Datos"
   └─ Ve:
      ├─ Gráfica de presión histórica
      ├─ Estadísticas del día:
      │  ├─ Total de lecturas
      │  ├─ Presión máxima
      │  ├─ Presión promedio
      │  └─ Total de alertas
      └─ Historial completo con timestamps
```

### Escenario: Reinicio del Sistema

```
Si la API Vercel se reinicia:
├─ Pierde datos en memoria
├─ Frontend intenta GET /api/peluches/{codigo}
├─ Backend retorna error 404
├─ Frontend USA localStorage como fallback
├─ Continúa funcionando con datos guardados localmente
└─ Nueva lectura se guarda en nueva instancia de API
   ├─ Cuando ESP32 envía POST /api/sensor-data
   ├─ Backend vuelve a existir
   ├─ Continúa recibiendo datos
   └─ Frontend sincronizado nuevamente
```

---

## 11. CARACTERÍSTICAS PRINCIPALES

### Hardware/Firmware
- ✅ ESP32 con MicroPython
- ✅ Sensor FSR (Force Sensitive Resistor)
- ✅ WiFi integrado
- ✅ ADC 12-bit para precisión
- ✅ Servidor HTTP local
- ✅ Envío a cloud (Vercel)

### Detección de Ansiedad
- ✅ 4 niveles: tranquilo, leve, moderado, crisis
- ✅ Umbrales configurables
- ✅ Filtrado de ruido (mínimo 30%)
- ✅ Timestamps precisos

### Tiempo Real
- ✅ SSE (Server-Sent Events) para actualizaciones
- ✅ EventEmitter para notificaciones
- ✅ Latencia mínima
- ✅ Sin polling (sin refresh continuo)

### Audio y Multimedia
- ✅ 4 sonidos locales relajantes
- ✅ 4 videos YouTube integrados
- ✅ Autoplay en crisis
- ✅ Control de volumen

### Recursos de Apoyo
- ✅ 11 centros psicológicos con mapas
- ✅ Información sobre trastornos mentales
- ✅ Guía de manejo de crisis
- ✅ Contactos de emergencia configurables

### Persistencia y Resiliencia
- ✅ localStorage como fallback
- ✅ Funciona sin backend (modo offline)
- ✅ Datos salvos automáticamente
- ✅ Recuperación ante desconexión

### Seguridad
- ✅ Validación de códigos (NUTRIA-XXXXXX)
- ✅ Validación de rangos
- ✅ CORS habilitado
- ✅ Manejo robusto de errores

### Escalabilidad
- ✅ Múltiples peluches simultáneamente
- ✅ Almacenamiento en memoria (eficiente)
- ✅ Serverless (sin servidor dedicado)
- ✅ Deploy automático en Vercel

---

## 📊 Resumen Técnico Rápido

| Aspecto | Tecnología |
|--------|-----------|
| **Hardware** | ESP32 + FSR402 |
| **Firmware** | MicroPython |
| **Backend** | Vercel Serverless (Node.js) |
| **Frontend** | React 19.2.0 |
| **Comunicación** | HTTP POST + SSE |
| **Almacenamiento** | Memoria (EventEmitter) + localStorage |
| **Gráficas** | Recharts |
| **Videos** | YouTube API |
| **Validaciones** | Regex + Range checks |
| **UI/UX** | CSS-in-JS (Inline Styles) |
| **Deploy** | GitHub Pages + Vercel |

---

## 🎯 Conclusión

**Nutrias en Equilibrio** es un sistema completo e integrado que:

1. **Detecta crisis de ansiedad** en tiempo real usando hardware IoT
2. **Proporciona alertas inmediatas** con sonidos y visuales
3. **Ofrece recursos de apoyo** (sonidos, videos, contactos)
4. **Persiste datos** localmente para resiliencia
5. **Escala sin límite** gracias a serverless
6. **Fácil de usar** sin configuración compleja
7. **Asequible** (hardware barato, sin suscripción)

Es un proyecto educativo y de alto impacto social para personas con trastornos de ansiedad.

---

**Documento generado:** 10 de Marzo, 2026
**Versión del proyecto:** 0.1.0
