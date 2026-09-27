/** Lectura inicial y seguimiento opcional. Las coordenadas no se envían al servidor. */
export class LocationController {
  constructor({ onState, onPosition, onTrackingChange = () => {} }) {
    Object.assign(this, { onState, onPosition, onTrackingChange });
    this.pending = false; this.watchId = null; this.generation = 0;
  }
  available() {
    if (!window.isSecureContext || !navigator.geolocation) {
      this.onState('error', 'La ubicación necesita HTTPS y un navegador compatible.'); return false;
    }
    return true;
  }
  receive(position, continuous) {
    this.pending = false;
    const { latitude, longitude, accuracy } = position.coords;
    if (![latitude, longitude, accuracy].every(Number.isFinite) || accuracy < 0 || Date.now() - position.timestamp > 45000) {
      this.onState('error', 'Esperando una lectura de ubicación válida y actualizada.'); return;
    }
    this.onState('located', `${continuous ? 'Actualizando en vivo. ' : ''}Precisión aproximada: ±${Math.round(accuracy)} m.`);
    this.onPosition([longitude, latitude], accuracy, { continuous });
  }
  fail(error, continuous = false) {
    this.pending = false;
    if (continuous && error.code === 1) this.stopTracking();
    const messages = { 1: 'Permiso no concedido. Habilitá la ubicación en los permisos del sitio.', 2: 'No hay señal de ubicación. Revisá el GPS o la conexión.', 3: 'La lectura tardó demasiado. Esperando una nueva ubicación.' };
    this.onState('error', messages[error.code] || 'No se pudo obtener tu ubicación.');
  }
  request() {
    if (this.pending || !this.available()) return;
    const generation = this.generation;
    this.pending = true; this.onState('pending', 'Esperando permiso y señal de ubicación…');
    navigator.geolocation.getCurrentPosition(p => { if (generation === this.generation) this.receive(p, false); }, e => { if (generation === this.generation) this.fail(e); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 });
  }
  startTracking() {
    if (this.watchId !== null || !this.available()) return false;
    const generation = ++this.generation;
    this.pending = true; this.onTrackingChange(true);
    this.onState('pending', 'Iniciando ubicación en tiempo real…');
    this.watchId = navigator.geolocation.watchPosition(p => { if (generation === this.generation) this.receive(p, true); }, e => { if (generation === this.generation) this.fail(e, true); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 });
    return true;
  }
  stopTracking() {
    this.generation++; this.pending = false;
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null; this.onTrackingChange(false);
  }
}
