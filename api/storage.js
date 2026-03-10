// Simple in-memory storage with SSE support
import EventEmitter from 'events';

const peluches = {};
const lecturas = {}; // { [pelucheId]: [lectura, ...] }
const emitter = new EventEmitter();

// Peluche helpers
export function getPeluche(id) {
  return peluches[id] || null;
}

export function addPeluche(id, config) {
  peluches[id] = { ...config, codigo: id };
  return peluches[id];
}

// Lecturas helpers
export function getLecturas(id) {
  return lecturas[id] || [];
}

export function addLectura(id, lectura) {
  if (!lecturas[id]) lecturas[id] = [];
  lecturas[id].push(lectura);
  // notify listeners
  emitter.emit(`lectura:${id}`, lectura);
  return lectura;
}

export function getLatestLectura(id) {
  const arr = lecturas[id];
  return arr && arr.length ? arr[arr.length - 1] : null;
}

// SSE helpers
export function onNewLectura(id, cb) {
  emitter.on(`lectura:${id}`, cb);
}

export function removeLecturaListener(id, cb) {
  emitter.off(`lectura:${id}`, cb);
}
