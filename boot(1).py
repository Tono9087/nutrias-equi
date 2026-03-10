# boot.py - Se ejecuta automáticamente al encender el ESP32
# Configuración inicial del sistema

import gc
import esp

# Deshabilitar debug para ahorrar memoria
esp.osdebug(None)

# Recolección de basura
gc.collect()

print('=' * 40)
print('Peluche Anti-Ansiedad v1.0')
print('ESP32 con MicroPython')
print('=' * 40)
