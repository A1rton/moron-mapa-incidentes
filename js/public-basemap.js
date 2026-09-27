/** Fondo público sin credenciales, integrado en la misma API de Leaflet.
 * OpenFreeMap + MapLibre GL Leaflet: https://openfreemap.org/quick_start/
 * El modo raster de emergencia usa OSM, con su atribución y caché del navegador.
 */
export async function createPublicBasemap(map, config, report) {
  if (typeof L.maplibreGL === 'function' && typeof maplibregl !== 'undefined') {
    let layer;
    try {
      layer = L.maplibreGL({ style: config.publicStyle, interactive: false,
        renderWorldCopies: false,
        attributionControl: { customAttribution: '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' } });
      layer.addTo(map);
      const gl = layer.getMaplibreMap();
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('El fondo vectorial no respondió.')), 15000);
        const loaded = () => finish();
        const failed = event => finish(event.error || new Error('No se pudo cargar el fondo.'));
        function finish(error) { clearTimeout(timer); gl.off('load', loaded); gl.off('error', failed); error ? reject(error) : resolve(); }
        if (gl.loaded()) finish(); else { gl.on('load', loaded); gl.on('error', failed); }
      });
      const labels = [], buildings = [];
      for (const entry of gl.getStyle().layers) {
        const id = entry.id, sourceLayer = entry['source-layer'] || '';
        if (entry.type === 'background') gl.setPaintProperty(id, 'background-color', '#06131e');
        if (entry.type === 'fill') {
          if (/water/.test(sourceLayer)) gl.setPaintProperty(id, 'fill-color', '#082a3c');
          else if (/building/.test(sourceLayer)) {
            buildings.push(id); gl.setLayerZoomRange(id, 15, 24);
            gl.setPaintProperty(id, 'fill-color', '#145567');
            gl.setPaintProperty(id, 'fill-opacity', .6);
            gl.setPaintProperty(id, 'fill-outline-color', '#4395a7');
          } else gl.setPaintProperty(id, 'fill-color', '#0b202b');
        }
        if (entry.type === 'fill-extrusion') gl.setLayoutProperty(id, 'visibility', 'none');
        if (entry.type === 'line' && /transportation|road|rail/.test(sourceLayer)) {
          gl.setPaintProperty(id, 'line-color', /cas(e|ing)|outline/.test(id) ? '#102e3b' : /motorway|trunk|primary/.test(id) ? '#51c8de' : '#238098');
        }
        if (entry.type === 'symbol') {
          if (/poi|aerodrome|housenumber/.test(sourceLayer) || /poi|airport|aerodrome/.test(id)) gl.setLayoutProperty(id, 'visibility', 'none');
          else if (entry.layout?.['text-field']) {
            labels.push(id); gl.setPaintProperty(id, 'text-color', '#a7d6e3');
            gl.setPaintProperty(id, 'text-halo-color', '#06131e'); gl.setPaintProperty(id, 'text-halo-width', 1.5);
          }
        }
      }
      map.getContainer().classList.add('vector-basemap');
      return { vector: true,
        setLabels: enabled => labels.forEach(id => gl.setLayoutProperty(id, 'visibility', enabled ? 'visible' : 'none')),
        setBuildings: enabled => buildings.forEach(id => gl.setLayoutProperty(id, 'visibility', enabled ? 'visible' : 'none')),
      };
    } catch (error) {
      try { layer?.remove(); } catch { /* También cubre errores durante la creación de WebGL. */ }
      console.warn('Fondo vectorial no disponible; se usa OSM raster.', error.message);
      report('Se activó el mapa básico de respaldo.');
    }
  }
  map.getContainer().classList.add('raster-basemap');
  const base = L.tileLayer(config.publicRasterTiles, { noWrap: true,
    bounds: config.homeBounds.map(([lng, lat]) => [lat, lng]), maxNativeZoom: 19, maxZoom: config.maxZoom,
    updateWhenIdle: true, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
  let errors = 0;
  base.on('tileerror', () => { if (++errors === 3) report('No se pudo cargar el mapa base. Revisá la conexión.'); });
  base.on('tileload', () => { errors = 0; });
  return { vector: false, setLabels: () => {}, setBuildings: () => {} };
}
