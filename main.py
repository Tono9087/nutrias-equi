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

# ===== INICIALIZACIÓN =====

print('\nIniciando sistema...')
print('Peluche ID:', PELUCHE_ID)
print('Nombre:', PELUCHE_NOMBRE)

# Conectar WiFi
wifi = conectar_wifi()

if wifi is None:
    print('Sistema detenido: sin conexión WiFi')
else:
    # Obtener configuración desde la nube al arrancar
    if urequests and BACKEND_URL:
        try:
            print('Solicitando configuración al backend...')
            conf_url = BACKEND_URL.rstrip('/') + '/api/peluches/' + PELUCHE_ID
            resp = urequests.get(conf_url)
            if resp.status_code == 200:
                conf_data = resp.json()
                if conf_data.get('success') and conf_data.get('data'):
                    cfg = conf_data['data']
                    if 'umbralAlerta' in cfg:
                        UMBRAL_ALERTA = cfg['umbralAlerta']
                    print('Configuración remota aplicada:', cfg)
            resp.close()
        except Exception as econf:
            print('No se pudo obtener configuración remota:', econf)

    print('\n' + '='*40)
    print('Sistema listo! Enviando datos cada segundo...')
    print('Peluche:', PELUCHE_NOMBRE, '(' + PELUCHE_ID + ')')
    print('='*40 + '\n')

    url_sensor = BACKEND_URL.rstrip('/') + '/api/sensor'
    hdr = {'Content-Type': 'application/json'}

    # ===== LOOP PRINCIPAL: envío activo cada segundo =====
    while True:
        try:
            presion = leer_presion()
            estado_info = detectar_estado(presion)

            print('[' + PELUCHE_ID + '] Presión:', str(presion) + '% | Estado:', estado_info['estado'])

            # Enviar a Vercel
            if urequests and BACKEND_URL:
                try:
                    payload = json.dumps({'device_id': PELUCHE_ID, 'pressure': presion})
                    resp = urequests.post(url_sensor, data=payload, headers=hdr)
                    resp.close()
                except Exception as ec:
                    print('Error enviando a la nube:', ec)

            time.sleep(1)

        except Exception as e:
            print('Error en loop:', e)
            time.sleep(1)