import { isInsideMoron } from './territory.js';

export function distanceMeters(a, b) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

/** Se calcula en el dispositivo. No transmite ni conserva el recorrido. */
export class ProximityMonitor {
  constructor({ onAlert, onStatus, now = () => Date.now() }) {
    this.onAlert = onAlert; this.onStatus = onStatus; this.now = now;
    this.enabled = false; this.radius = 500; this.features = []; this.position = null; this.notices = new Map();
  }
  setEnabled(enabled) { this.enabled = enabled; if (!enabled) this.position = null; this.evaluate(); }
  setRadius(radius) { this.radius = radius; this.evaluate(); }
  setIncidents(features) { this.features = features; this.evaluate(); }
  setPosition(center, accuracy) { this.position = { center, accuracy, time: this.now() }; this.evaluate(); }
  invalidate() { this.position = null; this.evaluate(); }
  evaluate() {
    if (!this.enabled) return this.onStatus('Activá la ubicación en tiempo real para recibir avisos.');
    const p = this.position;
    if (!p || this.now() - p.time > 45000) return this.onStatus('Esperando una ubicación actualizada para comprobar incidentes…');
    if (!isInsideMoron(p.center)) return this.onStatus('Estás fuera de Morón. Los avisos se activan dentro del partido.');
    if (!Number.isFinite(p.accuracy) || p.accuracy > this.radius) return this.onStatus('La ubicación tiene poca precisión. Los avisos esperan una señal más precisa.');
    const nearby = [];
    for (const feature of this.features) {
      const distance = distanceMeters(p.center, feature.geometry.coordinates);
      const id = String(feature.id ?? feature.properties?.id);
      const previous = this.notices.get(id);
      if (distance <= this.radius) {
        nearby.push({ feature, distance });
        if (!previous?.inside && (!previous || this.now() - previous.time > 120000)) {
          this.notices.set(id, { inside: true, time: this.now() });
          this.onAlert({ feature, distance });
        }
      } else if (previous && distance > this.radius + 100) previous.inside = false;
    }
    const ids = new Set(this.features.map(f => String(f.id ?? f.properties?.id)));
    for (const [id, record] of this.notices) if (!ids.has(id)) record.inside = false;
    this.onStatus(nearby.length ? `${nearby.length} incidente${nearby.length === 1 ? '' : 's'} a menos de ${this.radius} m. Precisión: ±${Math.round(p.accuracy)} m.` : `Sin incidentes seleccionados a menos de ${this.radius} m. Ubicación en vivo.`);
  }
}
