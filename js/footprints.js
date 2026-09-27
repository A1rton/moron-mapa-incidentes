/** Huellas OSM para la alternativa Leaflet. No contiene alturas ni datos inventados.
 * Consulta acotada al área visible, solo desde zoom 16. En producción reemplazar
 * el endpoint público por teselas vectoriales / servicio propio con SLA.
 */
export class FootprintLayer {
  constructor(map, config, onStatus) {
    this.map = map; this.config = config; this.onStatus = onStatus;
    this.enabled = config.enabled; this.cache = new Map(); this.generation = 0;
    this.layer = L.geoJSON(null, { interactive: false, renderer: L.canvas(),
      style: { color: '#4599ab', weight: .8, fillColor: '#196175', fillOpacity: .28 } }).addTo(map);
    this.schedule = () => {
      clearTimeout(this.timer);
      this.controller?.abort(); this.generation++;
      if (!this.enabled || this.map.getZoom() < this.config.minZoom) {
        this.layer.clearLayers(); this.onStatus(this.enabled ? 'Acercá a zoom 16 para ver huellas.' : 'Edificios ocultos.'); return;
      }
      this.timer = setTimeout(() => this.load(), 700);
    };
    map.on('moveend', this.schedule);
    this.schedule();
  }
  setVisible(enabled) { this.enabled = enabled; this.layer.clearLayers(); this.schedule(); }
  async load() {
    const bounds = this.map.getBounds();
    const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()];
    // No saturar Overpass en monitores grandes o vistas demasiado amplias.
    const areaKm2 = Math.abs((bbox[2] - bbox[0]) * 111 * (bbox[3] - bbox[1]) * 111 * Math.cos(bbox[0] * Math.PI / 180));
    if (areaKm2 > 12) { this.layer.clearLayers(); this.onStatus('Acercá un poco más para ver huellas.'); return; }
    const key = bbox.map(n => n.toFixed(4)).join(',');
    const apply = data => { this.layer.clearLayers(); this.layer.addData(data); this.onStatus(data.features.length ? 'Huellas de OpenStreetMap.' : 'Sin huellas OSM en esta vista.'); };
    if (this.cache.has(key)) { apply(this.cache.get(key)); return; }
    this.layer.clearLayers(); this.onStatus('Cargando huellas de edificios…');
    const generation = this.generation;
    const controller = new AbortController(); this.controller = controller;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 14000);
    try {
      const query = `[out:json][timeout:12];way["building"](${bbox.join(',')});out geom;`;
      const response = await fetch(this.config.endpoint, { method: 'POST', body: new URLSearchParams({ data: query }), signal: controller.signal });
      if (!response.ok) throw new Error('Servicio OSM temporalmente no disponible.');
      const body = await response.json();
      if (body.remark) throw new Error('La consulta OSM devolvió datos incompletos.');
      if (generation !== this.generation || !this.enabled) return;
      const features = (body.elements || []).filter(item => item.type === 'way' && item.geometry?.length >= 4).flatMap(item => {
        const ring = item.geometry.map(p => [p.lon, p.lat]);
        if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) return [];
        return [{ type: 'Feature', properties: { osm_id: item.id }, geometry: { type: 'Polygon', coordinates: [ring] } }];
      });
      const data = { type: 'FeatureCollection', features };
      this.cache.set(key, data);
      if (this.cache.size > 12) this.cache.delete(this.cache.keys().next().value);
      apply(data);
    } catch (error) {
      if (generation === this.generation && (error.name !== 'AbortError' || timedOut)) this.onStatus('Huellas no disponibles. El mapa sigue activo.');
    } finally { clearTimeout(timeout); }
  }
  destroy() { clearTimeout(this.timer); this.controller?.abort(); this.map.off('moveend', this.schedule); this.layer.remove(); }
}
