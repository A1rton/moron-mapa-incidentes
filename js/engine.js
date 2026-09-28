import { createMapboxEngine } from './mapbox-engine.js';
import { createLeafletEngine } from './leaflet-engine.js';

function loadAsset(url, type) {
  return new Promise((resolve, reject) => {
    const element = document.createElement(type === 'style' ? 'link' : 'script');
    if (type === 'style') { element.rel = 'stylesheet'; element.href = url; }
    else { element.src = url; element.async = true; }
    const timer = setTimeout(() => { element.remove(); reject(new Error('Tiempo de carga agotado.')); }, 18000);
    element.onload = () => { clearTimeout(timer); resolve(); };
    element.onerror = () => { clearTimeout(timer); element.remove(); reject(new Error(`No se pudo cargar ${url}`)); };
    // Las reglas propias deben quedar después del CSS del proveedor.
    if (type === 'style') document.head.insertBefore(element, document.querySelector('link[href$="styles.css"]'));
    else document.head.append(element);
  });
}

export async function createEngine(config, report, onFootprintStatus) {
  if (config.mapboxToken.startsWith('pk.')) {
    try {
      await Promise.all([
        loadAsset(`https://api.mapbox.com/mapbox-gl-js/v${config.mapboxVersion}/mapbox-gl.css`, 'style'),
        loadAsset(`https://api.mapbox.com/mapbox-gl-js/v${config.mapboxVersion}/mapbox-gl.js`, 'script'),
      ]);
      if (!mapboxgl.supported()) throw new Error('WebGL no está disponible.');
      return await createMapboxEngine(config, report);
    } catch (error) {
      console.warn('Se usa Leaflet: Mapbox no pudo iniciarse.', error.message);
      report('Mapbox no está disponible. Se activó la alternativa 2D.');
      document.querySelector('#map').replaceChildren();
    }
  } else if (config.mapboxToken) report('El token de Mapbox debe ser público (pk.). Se usa la alternativa 2D.');
  await Promise.all([
    loadAsset('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'style'),
    loadAsset('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'script'),
  ]);
  // Binding oficial: Leaflet sigue controlando cámara, máscaras y marcadores.
  try {
    await Promise.all([
      loadAsset('https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css', 'style'),
      loadAsset('https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js', 'script'),
    ]);
    await loadAsset('https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js', 'script');
  } catch (error) { console.warn('No se pudo iniciar el fondo vectorial. Se usará OSM raster.', error.message); }
  return createLeafletEngine(config, report, onFootprintStatus);
}
