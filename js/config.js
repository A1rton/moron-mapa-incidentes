import { MORON_BOUNDS, NAVIGATION_BOUNDS } from './territory.js';
/** Configuración pública. Nunca pongas aquí tokens secretos (sk.*). */
export const CONFIG = Object.freeze({
  // ACTIVAR MAPBOX: pegá tu token público pk.* y recargá la página.
  // Restringí el token a los dominios autorizados en tu cuenta de Mapbox.
  mapboxToken: '',
  mapboxVersion: '3.30.0',
  mapboxStyle: 'mapbox://styles/mapbox/dark-v11',
  // Proveedor predeterminado sin API key. No usa las teselas de CARTO.
  publicStyle: 'https://tiles.openfreemap.org/styles/liberty',
  publicRasterTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  center: [-58.6198, -34.6509], // GeoJSON y Mapbox: [longitud, latitud].
  zoom: 13.3,
  minZoom: 11.5,
  maxZoom: 20,
  // El polígono territorial recorta el mapa; el rectángulo solo acota la cámara.
  homeBounds: MORON_BOUNDS,
  navigationBounds: NAVIGATION_BOUNDS,
  // INTEGRAR LÍMITES: URL de un FeatureCollection oficial Polygon/MultiPolygon,
  // en WGS84 (EPSG:4326), por ejemplo './data/localidades.geojson'.
  boundariesUrl: '',
  // INTEGRAR INCIDENTES: URL de tu API o GeoJSON. Vacío = ningún dato inventado.
  incidentsUrl: '/api/incidents.php',
  // Leaflet consulta huellas OSM solo al acercar (zoom >= 16), con caché,
  // debounce, cancelación y un área máxima. En producción, usá tu proveedor.
  footprints: { enabled: true, minZoom: 16, endpoint: 'https://overpass-api.de/api/interpreter' },
});
