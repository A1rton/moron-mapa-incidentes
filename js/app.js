import { CONFIG } from './config.js';
import { createEngine } from './engine.js';
import { LocationController } from './geolocation.js';
import { IncidentStore } from './incidents.js';
import { validateCollection } from './geojson.js';
import { registerMapTools } from './webmcp.js';
import { isInsideMoron } from './territory.js';
import { mountIncidentFilters } from './incident-filters.js';
import { mountAddressSearch } from './address-search.js';
import { ProximityMonitor } from './proximity.js';

const $ = selector => document.querySelector(selector);
let engine, lastPosition, toastTimer, liveTracking = false, centerNextLiveFix = false, nearestAlert;
const proximity = new ProximityMonitor({
  onStatus: message => { $('#proximity-status').textContent = message; },
  onAlert: ({ feature, distance }) => {
    nearestAlert = feature;
    $('#nearby-title').textContent = feature.properties.title || 'Incidente cerca';
    $('#nearby-message').textContent = `A unos ${Math.max(10, Math.round(distance / 10) * 10)} m: ${feature.properties.address || feature.properties.category || 'incidente reportado'}.`;
    $('#nearby-alert').hidden = false;
  },
});
$('#dismiss-nearby').addEventListener('click', () => { $('#nearby-alert').hidden = true; });
$('#nearby-view').addEventListener('click', () => {
  if (engine && nearestAlert) { engine.flyTo(nearestAlert.geometry.coordinates, 17); engine.openIncident?.(nearestAlert); closeMobilePanel(); }
});
function toast(message) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6500);
}
function setLocationState(state, message) {
  $('#location-state').textContent = { pending: 'LOCALIZANDO', located: 'LOCALIZADA', outside: 'FUERA DE MORÓN', error: 'SIN UBICACIÓN' }[state];
  $('#location-state').classList.toggle('located', state === 'located');
  $('#location-description').textContent = message;
  $('#location-button').disabled = state === 'pending';
  $('#locate-control').disabled = state === 'pending';
  $('#location-button span').textContent = state === 'located' ? 'Centrar en mi ubicación' : state === 'pending' ? 'Buscando ubicación…' : 'Usar mi ubicación';
  if (state === 'error') proximity.invalidate();
}
function showPosition(recenter = true) {
  if (!engine || !lastPosition) return;
  const { center, accuracy } = lastPosition;
  if (!isInsideMoron(center)) {
    engine.clearLocation();
    setLocationState('outside', 'Tu ubicación está fuera del partido de Morón. El mapa permanece en Morón.');
    if (recenter) engine.home();
    return;
  }
  engine.setLocation(center, accuracy);
  // Una ubicación de baja precisión no se presenta como una posición exacta.
  if (recenter) engine.flyTo(center, accuracy > 3000 ? 13 : accuracy > 600 ? 14 : 16.5);
}
const location = new LocationController({ onState: setLocationState,
  onTrackingChange: enabled => { liveTracking = enabled; centerNextLiveFix = enabled; $('#live-location-toggle').checked = enabled; proximity.setEnabled(enabled); if (!enabled) $('#nearby-alert').hidden = true; },
  onPosition: (center, accuracy, { continuous }) => {
    lastPosition = { center, accuracy }; showPosition(!continuous || centerNextLiveFix); centerNextLiveFix = false;
    if (liveTracking) proximity.setPosition(center, accuracy);
  },
});
$('#live-location-toggle').addEventListener('change', event => {
  if (event.target.checked) { if (!location.startTracking()) event.target.checked = false; }
  else { location.stopTracking(); if (lastPosition) setLocationState('located', 'Seguimiento detenido. Se muestra tu última ubicación.'); }
});
$('#alert-radius').addEventListener('change', event => proximity.setRadius(Number(event.target.value)));
setInterval(() => proximity.evaluate(), 5000);
window.addEventListener('pagehide', () => location.stopTracking());
// Solicitud automática al abrir. El navegador decide si muestra el diálogo;
// si la bloquea sin gesto, el botón permite volver a solicitarla explícitamente.
location.request();

$('#location-button').addEventListener('click', () => lastPosition && isInsideMoron(lastPosition.center) ? showPosition() : location.request());
$('#locate-control').addEventListener('click', () => lastPosition && isInsideMoron(lastPosition.center) ? showPosition() : location.request());
$('#reload-button').addEventListener('click', () => window.location.reload());
const panel = $('.panel'); panel.id = 'map-panel';
$('#mobile-panel-button').addEventListener('click', () => {
  const opened = panel.classList.toggle('open');
  $('#mobile-panel-button').setAttribute('aria-expanded', String(opened));
  $('#mobile-panel-button').lastElementChild.textContent = opened ? '↓' : '↑';
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel.classList.contains('open')) { panel.classList.remove('open'); $('#mobile-panel-button').setAttribute('aria-expanded', 'false'); $('#mobile-panel-button').lastElementChild.textContent = '↑'; $('#mobile-panel-button').focus(); }
});

async function fetchGeoJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/geo+json, application/json' } });
    if (!response.ok) throw new Error(`No se pudo obtener el recurso (${response.status}).`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

async function start() {
  try {
    engine = await createEngine(CONFIG, toast, message => { $('#buildings-note').textContent = message; });
    $('#address-query').disabled = false; $('#address-search button').disabled = false;
    mountAddressSearch({ form: $('#address-search'), input: $('#address-query'), results: $('#search-results'), status: $('#search-status'), onSelect: place => { engine.setSearchLocation(place.center, place.label); engine.flyTo(place.center, 17); closeMobilePanel(); } });
    $('#engine-label').textContent = `${engine.name} / 2D`;
    $('#connection-text').textContent = 'Mapa activo'; $('#connection').classList.add('ready');
    $('#labels-toggle').addEventListener('change', event => engine.setLabels(event.target.checked));
    if (engine.supportsLabelToggle === false) {
      $('#labels-toggle').disabled = true;
      $('#labels-toggle').closest('label').title = 'En el mapa básico de respaldo los nombres están integrados en la imagen.';
    }
    $('#buildings-toggle').addEventListener('change', event => engine.setBuildings(event.target.checked));
    $('#boundaries-toggle').disabled = false; $('#boundaries-toggle').checked = true;
    $('#boundaries-toggle').closest('label').classList.remove('muted');
    $('#boundaries-toggle').addEventListener('change', event => engine.showBoundaries(event.target.checked));
    $('#boundaries-note').textContent = 'Contorno de Morón · Georef / Datos Argentina.';
    $('#home-button').addEventListener('click', () => { engine.home(); closeMobilePanel(); });
    $('#zoom-in').addEventListener('click', () => engine.zoomBy(.75));
    $('#zoom-out').addEventListener('click', () => engine.zoomBy(-.75));
    $('#north-button').addEventListener('click', () => engine.north());
    const updateView = () => {
      const { center, zoom } = engine.getView();
      $('#center-coordinates').textContent = `${center[1].toFixed(5)}, ${center[0].toFixed(5)}`;
      $('#zoom-level').textContent = zoom.toFixed(1);
      $('#detail-level').textContent = zoom >= 16 ? 'Detalle de edificios' : zoom >= 14 ? 'Detalle de calles' : 'Vista territorial';
      $('#map-hint').hidden = zoom >= 16;
    };
    engine.onMove(updateView); updateView();
    if (engine.name === 'MAPBOX') $('#buildings-note').textContent = 'Huellas de edificios según cobertura de Mapbox.';
    window.addEventListener('resize', () => engine.resize());

    const incidents = new IncidentStore(engine, (summary, visible) => {
      refreshIncidentFilters(summary); proximity.setIncidents(visible.features);
      if (nearestAlert && !visible.features.some(f => String(f.id) === String(nearestAlert.id))) $('#nearby-alert').hidden = true;
    });
    const refreshIncidentFilters = mountIncidentFilters(ids => incidents.setCategories(ids));
    incidents.render();

    // PUNTO DE EXTENSIÓN 2: límites oficiales validados.
    // El PDF de referencia NO es GeoJSON; no se inventan ni trazan límites a ojo.
    function setBoundaries(collection) {
      validateCollection(collection, ['Polygon', 'MultiPolygon']);
      engine.setBoundaries(collection); engine.showBoundaries(true);
      $('#boundaries-toggle').checked = true;
      $('#boundaries-note').textContent = collection.features.length ? 'Morón y divisiones internas cargadas.' : 'Contorno de Morón · Georef / Datos Argentina.';
    }

    // API estable para la futura aplicación. Esperá a moron:ready antes de usarla.
    window.MoronMap = Object.freeze({
      setIncidents: data => incidents.setData(data), addIncident: feature => incidents.add(feature),
      removeIncident: id => incidents.remove(id), clearIncidents: () => incidents.clear(),
      setIncidentCategories: ids => incidents.setCategories(ids),
      getIncidentSummary: () => incidents.getSummary(),
      setBoundaries, locate: () => location.request(), home: () => engine.home(),
      getView: () => engine.getView(),
    });
    window.dispatchEvent(new CustomEvent('moron:ready', { detail: { engine: engine.name } }));
    registerMapTools(engine);

    // PUNTO DE EXTENSIÓN 3: reemplazá esta carga inicial por tu API / WebSocket.
    // Ejemplo: socket.onmessage = e => window.MoronMap.setIncidents(JSON.parse(e.data));
    let loadingIncidents = false, lastPayload = '', loadFailed = false;
    async function refreshIncidents() {
      if (loadingIncidents || document.hidden || !CONFIG.incidentsUrl) return;
      loadingIncidents = true;
      try {
        const data = await fetchGeoJSON(CONFIG.incidentsUrl), payload = JSON.stringify(data);
        if (payload !== lastPayload) { incidents.setData(data); lastPayload = payload; }
        loadFailed = false; $('#connection-text').textContent = 'Mapa e incidentes activos';
      } catch {
        if (!loadFailed) toast('No se pudieron actualizar los incidentes. Se conserva la última información disponible.');
        loadFailed = true; $('#connection-text').textContent = 'Incidentes sin actualizar';
      } finally { loadingIncidents = false; }
    }
    refreshIncidents(); setInterval(refreshIncidents, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshIncidents(); });
    if (CONFIG.boundariesUrl) fetchGeoJSON(CONFIG.boundariesUrl).then(setBoundaries).catch(() => { toast('No se pudieron cargar las divisiones internas. El límite de Morón sigue activo.'); });
    engine.home();
    if (lastPosition) showPosition();
    engine.setLabels($('#labels-toggle').checked); engine.setBuildings($('#buildings-toggle').checked);
    document.body.classList.add('territory-ready');
  } catch (error) {
    console.error('No se pudo iniciar el mapa:', error);
    $('#fatal-error').hidden = false; $('#connection-text').textContent = 'Sin conexión al mapa'; $('#connection').classList.add('error');
  }
}
function closeMobilePanel() {
  panel.classList.remove('open'); $('#mobile-panel-button').setAttribute('aria-expanded', 'false'); $('#mobile-panel-button').lastElementChild.textContent = '↑';
}
start();
