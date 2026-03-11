# main.py - Script principal del Peluche Anti-Ansiedad
# Se ejecuta automáticamente después de boot.py

from machine import ADC, Pin
import network
import socket
import json
import time

# urequests puede no estar disponible en todos los builds; es muy común en
# MicroPython con soporte de red (esp32/esp8266).  Si no existe, la sección
# de envío a la nube se desactivará automáticamente.
try:
    import urequests
except ImportError:
    urequests = None

from config import *

# ===== CONFIGURACIÓN DEL SENSOR =====
sensor = ADC(Pin(PIN_SENSOR))
sensor.atten(ADC.ATTN_11DB)  # Rango completo 0-3.3V
sensor.width(ADC.WIDTH_12BIT)  # Resolución de 12 bits (0-4095)

# ===== FUNCIONES PRINCIPALES =====

def leer_presion():
    """Lee el valor del sensor y lo convierte a porcentaje (0-100%)"""
    valor = sensor.read()
    presion = int((valor / 4095) * 100)
    return presion

def detectar_estado(presion):
    """Determina el estado de ansiedad según la presión ejercida"""
    if presion < UMBRAL_NORMAL:
        return {
            "estado": "tranquilo",
            "nivel": 0,
            "descripcion": "Usuario tranquilo"
        }
    elif presion < UMBRAL_ALERTA:
        return {
            "estado": "leve",
            "nivel": 1,
            "descripcion": "Tensión leve detectada"
        }
    elif presion < UMBRAL_CRISIS:
        return {
            "estado": "moderado",
            "nivel": 2,
            "descripcion": "Ansiedad moderada"
        }
    else:
        return {
            "estado": "crisis",
            "nivel": 3,
            "descripcion": "Posible crisis de ansiedad"
        }

def conectar_wifi():
    """Conecta el ESP32 a la red WiFi"""
    import time
    
    # Desactivar WiFi AP si está activo
    ap = network.WLAN(network.AP_IF)
    ap.active(False)
    time.sleep(0.5)
    
    # Configurar WiFi en modo estación
    wifi = network.WLAN(network.STA_IF)
    
    # Desactivar completamente y esperar
    if wifi.active():
        wifi.disconnect()
        time.sleep(0.5)
        wifi.active(False)
        time.sleep(1)
    
    # Activar WiFi
    wifi.active(True)
    time.sleep(1)
    
    # Intentar conectar
    if not wifi.isconnected():
        print('Conectando a WiFi...')
        
        # Primer intento
        try:
            wifi.connect(WIFI_SSID, WIFI_PASSWORD)
            
            timeout = 0
            while not wifi.isconnected() and timeout < 20:
                print('.', end='')
                time.sleep(0.5)
                timeout += 1
            
            print()
            
        except Exception as e:
            print('Error en primer intento:', e)
            print('Reintentando...')
            
            # Segundo intento después de reset completo
            wifi.active(False)
            time.sleep(2)
            wifi.active(True)
            time.sleep(1)
            
            try:
                wifi.connect(WIFI_SSID, WIFI_PASSWORD)
                
                timeout = 0
                while not wifi.isconnected() and timeout < 20:
                    print('.', end='')
                    time.sleep(0.5)
                    timeout += 1
                
                print()
                
            except Exception as e2:
                print('Error en segundo intento:', e2)
                return None
    
    if wifi.isconnected():
        print('WiFi conectado!')
        config = wifi.ifconfig()
        print('IP:', config[0])
        print('Máscara:', config[1])
        print('Gateway:', config[2])
        return wifi
    else:
        print('Error: No se pudo conectar a WiFi')
        print('Verifica SSID y contraseña en config.py')
        return None

def iniciar_servidor():
    """Inicia el servidor HTTP para la API"""
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('0.0.0.0', PUERTO_API))
    s.listen(1)
    s.setblocking(False) # Evita que accept() pause el código de ESP32 para siempre
    print('Servidor API activo en puerto', PUERTO_API)
    return s

def generar_respuesta_http(datos):
    """Genera la respuesta HTTP con headers CORS"""
    body = json.dumps(datos)
    
    response = """HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Content-Length: {}
Connection: close

{}""".format(len(body), body)
    
    return response

# ===== INICIALIZACIÓN =====

print('\nIniciando sistema...')
print('Peluche ID:', PELUCHE_ID)
print('Nombre:', PELUCHE_NOMBRE)

# Conectar WiFi
wifi = conectar_wifi()

if wifi is None:
    print('Sistema detenido: sin conexión WiFi')
else:
    # Iniciar servidor
    servidor = iniciar_servidor()
    
    # opcional: obtener configuración desde la nube (umbral, preferencias, etc.)
    if urequests and BACKEND_URL:
        try:
            print('Solicitando configuración al backend...')
            conf_url = BACKEND_URL.rstrip('/') + '/api/peluches/' + PELUCHE_ID
            resp = urequests.get(conf_url)
            if resp.status_code == 200:
                conf_data = resp.json()
                if conf_data.get('success') and conf_data.get('data'):
                    cfg = conf_data['data']
                    # actualizar umbrales si vienen
                    if 'umbralAlerta' in cfg:
                        UMBRAL_ALERTA = cfg['umbralAlerta']
                    if 'umbralCrisis' in cfg:
                        # asumiendo que almacenas también este valor
                        UMBRAL_CRISIS = cfg['umbralCrisis']
                    print('Configuración remota aplicada:', cfg)
            resp.close()
        except Exception as econf:
            print('No se pudo obtener configuración remota:', econf)
    
    print('\n' + '='*40)
    print('Sistema listo!')
    print('Peluche:', PELUCHE_NOMBRE, '(' + PELUCHE_ID + ')')
    print('Accede a la API en: http://' + wifi.ifconfig()[0])
    print('='*40 + '\n')
    
    # Compatibilidad para linter / entorno local (PC) con funciones de MicroPython
    if hasattr(time, 'ticks_ms'):
        def ticks_ms() -> int:
            return getattr(time, 'ticks_ms')()
        def ticks_diff(ticks1: int, ticks2: int) -> int:
            return getattr(time, 'ticks_diff')(ticks1, ticks2)
    else:
        def ticks_ms() -> int:
            return int(time.time() * 1000)
        def ticks_diff(ticks1: int, ticks2: int) -> int:
            return ticks1 - ticks2

    # ===== LOOP PRINCIPAL =====
    ultimo_envio = ticks_ms()
    ultimo_print = ticks_ms()
    while True:
        try:
            # 1. Intentar aceptar conexión local (responder si nos preguntan de forma local)
            try:
                cliente, direccion = servidor.accept()
                cliente.settimeout(1.0) # timeout corto para evitar bloqueos
                try:
                    request = cliente.recv(1024)
                except OSError:
                    pass
                
                presion = leer_presion()
                estado_info = detectar_estado(presion)
                
                # Preparar datos de respuesta con identificador del peluche
                datos = {
                    'peluche_id': PELUCHE_ID,
                    'peluche_nombre': PELUCHE_NOMBRE,
                    'presion': presion,
                    'estado': estado_info['estado'],
                    'nivel': estado_info['nivel'],
                    'descripcion': estado_info['descripcion'],
                    'timestamp': time.time()
                }
                
                # Enviar respuesta local
                respuesta = generar_respuesta_http(datos)
                cliente.send(respuesta.encode())
                cliente.close()
            except OSError:
                # No hay clientes conectados localmente, ignorar.
                pass
                
            # 2. Enviar datos a la nube (Vercel) periódicamente cada 1 segundo (1000ms)
            ahora = ticks_ms()
            if ticks_diff(ahora, ultimo_envio) >= 1000:
                ultimo_envio = ahora
                
                presion = leer_presion()
                estado_info = detectar_estado(presion)
                
                # enviar la lectura al backend en la nube
                if urequests and BACKEND_URL:
                    try:
                        url = BACKEND_URL.rstrip('/') + '/api/sensor'
                        hdr = {'Content-Type': 'application/json'}
                        payload = json.dumps({
                            'device_id': PELUCHE_ID,
                            'pressure': presion
                        })
                        resp = urequests.post(url, data=payload, headers=hdr)
                        
                        # IMPRESIONES DE DIAGNÓSTICO PARA VERCEL
                        print("Respuesta de Vercel Código:", resp.status_code)
                        print("Texto de Vercel:", resp.text)
                        
                        resp.close()
                        print('POST Vercel [', PELUCHE_ID, '] Presión:', presion, '% |', estado_info['estado'])
                    except Exception as ec:
                        print('Error enviando datos a la nube:', ec)
                        
            # 3. Imprimir por consola cada 5 segundos
            if ticks_diff(ahora, ultimo_print) >= 5000:
                ultimo_print = ahora
                # No necesitamos leer_presion() de nuevo si ya la tenemos del ciclo actual arriba 
                # (pero para estar seguros, la leemos para el debug)
                presion_actual = leer_presion()
                print(f"[DEBUG] Presión actual del sensor: {presion_actual}%")
            
            # Pausa de 100ms para ahorrar ciclos de CPU
            time.sleep(0.1)
            
        except Exception as e:
            print('Error general en el loop:', e)
            try:
                cliente.close()
            except:
                pass
            time.sleep(1)