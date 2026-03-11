# Configuración del Peluche Anti-Ansiedad
# ESP32 con MicroPython

# ===== IDENTIFICADOR DEL PELUCHE =====
# IMPORTANTE: Cambia este ID para cada peluche diferente
# Formato requerido por la API: NUTRIA-XXXXXX (letras mayúsculas y números)
# Ejemplo válido: NUTRIA-ABC123, NUTRIA-00F9Z7, etc.
# No utilices guiones bajos ni menos de 6 caracteres después del guion.
PELUCHE_ID = 'NUTRIA-AB1234'  # ID registrado en la app web
PELUCHE_NOMBRE = 'Nutria de Tono'

# ===== CREDENCIALES WIFI =====
# Rellena con el SSID y la contraseña de tu red local.
# Si dejas estos valores tal como están, el ESP32 no podrá conectarse.
WIFI_SSID = 'pobre'
WIFI_PASSWORD = '123456791011'

# ===== CONFIGURACIÓN DEL SENSOR =====
PIN_SENSOR = 34  # GPIO34 para lectura analógica
PIN_LED_WIFI = 12  # GPIO12 (D12) - LED indicador de conexión WiFi

# ===== UMBRALES DE ANSIEDAD =====
# Ajusta estos valores según pruebas con el FSR402
UMBRAL_NORMAL = 30   # 0-30%: Usuario tranquilo
UMBRAL_ALERTA = 60   # 30-60%: Inicio de ansiedad
UMBRAL_CRISIS = 80   # 60-80%: Ansiedad moderada
                     # 80-100%: Crisis de ansiedad

# ===== CONFIGURACIÓN DEL SERVIDOR =====
PUERTO_API = 80  # Puerto HTTP estándar

# ===== CONEXIÓN A LA NUBE =====
# URL base de la API en Vercel o el servicio que almacena los datos del
# peluche. El ESP32 enviará sus lecturas a esta dirección para que la
# aplicación web pueda mostrarlas en tiempo real.
# Debe incluir el protocolo (http:// o https://) y no llevar barra final.
BACKEND_URL = 'https://nutrias-equilibrio-xi.vercel.app'

# ===== CONFIGURACIÓN DE MUESTREO =====
# Frecuencia de lectura del sensor (en segundos)
INTERVALO_LECTURA = 0.1
