import { accuracyPolygon, emptyCollection, incidentPopup, locationElement } from './geojson.js';
import { MORON_BOUNDARY, exteriorMask, isInsideMoron } from './territory.js';

/** Adaptador Mapbox: toda la lógica específica del motor queda en este archivo. */
export async function createMapboxEngine(config, report) {
  const map = new mapboxgl.Map({
    container: 'map', accessToken: config.mapboxToken, style: config.mapboxStyle,
    center: config.center, zoom: config.zoom, minZoom: config.minZoom, maxZoom: config.maxZoom,
    maxBounds: config.navigationBounds, renderWorldCopies: false,
    pitch: 0, maxPitch: 0, bearing: 0, dragRotate: false, antialias: true, attributionControl: false,
  });
  map.touchZoomRotate.disableRotation();
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Mapbox no respondió a tiempo.')), 18000);
      const loaded = () => finish();
      const failed = e => {
        // Durante el arranque, un token rechazado o estilo inaccesible habilita Leaflet.
        if (!map.isStyleLoaded()) finish(e.error || new Error('No se pudo cargar el estilo.'));
      };
      function finish(error) {
        clearTimeout(timer); map.off('load', loaded); map.off('error', failed);
        error ? reject(error) : resolve();
      }
      map.on('load', loaded); map.on('error', failed);
    });
    applyTacticalStyle(map);
  } catch (error) { map.remove(); throw error; }

  try {
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
  map.addControl(new mapboxgl.AttributionControl({ customAttribution: '<a href="https://datosgobar.github.io/georef-ar-api/shapefiles/" target="_blank" rel="noopener">Límite: Georef / Datos Argentina</a>', compact: true }), 'bottom-right');
  map.on('error', () => report('Algunos datos del mapa no pudieron cargarse. Revisá la conexión.'));
  const labelIds = map.getStyle().layers.filter(l => l.type === 'symbol' && l.layout?.['text-field'] && !/poi|transit|airport|ferry/i.test(l.id)).map(l => l.id);
  const firstLabel = labelIds[0];
  const addGeoSource = (id, data = emptyCollection()) => map.addSource(id, { type: 'geojson', data });

  // Edificios en planta: la cámara permanece siempre en 2D.
  map.addLayer({ id: 'tactical-building-footprints', source: 'composite', 'source-layer': 'building',
    type: 'fill', minzoom: 15, filter: ['within', MORON_BOUNDARY.geometry], paint: { 'fill-color': '#145567', 'fill-opacity': .52, 'fill-outline-color': '#3d9db0' } }, firstLabel);

  addGeoSource('official-boundaries');
  map.addLayer({ id: 'boundary-fill', type: 'fill', source: 'official-boundaries', paint: { 'fill-color': '#39d3e2', 'fill-opacity': .025 } }, firstLabel);
  map.addLayer({ id: 'boundary-glow', type: 'line', source: 'official-boundaries', paint: { 'line-color': '#40e5f5', 'line-width': 9, 'line-blur': 5, 'line-opacity': .55 } }, firstLabel);
  map.addLayer({ id: 'boundary-line', type: 'line', source: 'official-boundaries', paint: { 'line-color': '#75f4fc', 'line-width': 1.7 } }, firstLabel);

  map.addSource('incidents', { type: 'geojson', data: emptyCollection(), cluster: true, clusterMaxZoom: 14, clusterRadius: 45 });
  map.addLayer({ id: 'incident-clusters', type: 'circle', source: 'incidents', filter: ['has', 'point_count'], paint: { 'circle-color': '#183e4b', 'circle-stroke-color': '#f5b975', 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 18, 100, 24, 1000, 30] } });
  map.addLayer({ id: 'incident-count', type: 'symbol', source: 'incidents', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'] }, paint: { 'text-color': '#fff1d9' } });
  map.addLayer({ id: 'incident-pins', type: 'circle', source: 'incidents', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['coalesce', ['get', 'categoryColor'], '#ffa566'], 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff1ce' } });
  let activeIncidentPopup;
  map.on('click', 'incident-pins', e => {
    const feature = e.features?.[0];
    if (feature) {
      activeIncidentPopup?.remove();
      activeIncidentPopup = new mapboxgl.Popup({ offset: 12 }).setLngLat(feature.geometry.coordinates).setDOMContent(incidentPopup(feature)).addTo(map);
    }
  });
  map.on('click', 'incident-clusters', e => {
    const feature = e.features?.[0];
    if (!feature) return;
    map.getSource('incidents').getClusterExpansionZoom(feature.properties.cluster_id, (error, zoom) => {
      if (!error) map.easeTo({ center: feature.geometry.coordinates, zoom });
    });
  });
  for (const id of ['incident-pins', 'incident-clusters']) {
    map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
  }

  addGeoSource('location-accuracy');
  map.addLayer({ id: 'location-accuracy-fill', type: 'fill', source: 'location-accuracy', paint: { 'fill-color': '#aeff68', 'fill-opacity': .065 } });
  map.addLayer({ id: 'location-accuracy-line', type: 'line', source: 'location-accuracy', paint: { 'line-color': '#aeff68', 'line-width': 1, 'line-opacity': .32 } });
  // Recorte permanente: se agrega después de etiquetas, edificios e incidentes.
  // Ocultar el borde nunca desactiva la máscara ni la validación territorial.
  addGeoSource('moron-exterior', exteriorMask());
  map.addLayer({ id: 'moron-exterior-mask', type: 'fill', source: 'moron-exterior', paint: { 'fill-color': '#050e17', 'fill-opacity': 1, 'fill-antialias': false } });
  addGeoSource('moron-territory', MORON_BOUNDARY);
  map.addLayer({ id: 'moron-glow', type: 'line', source: 'moron-territory', paint: { 'line-color': '#4be7f0', 'line-width': 9, 'line-blur': 5, 'line-opacity': .6 } });
  map.addLayer({ id: 'moron-outline', type: 'line', source: 'moron-territory', paint: { 'line-color': '#75f4fc', 'line-width': 1.8 } });
  let marker, searchMarker;
  const visible = (id, enabled) => map.setLayoutProperty(id, 'visibility', enabled ? 'visible' : 'none');
  return {
    name: 'MAPBOX',
    getView: () => ({ center: [map.getCenter().lng, map.getCenter().lat], zoom: map.getZoom() }),
    onMove: callback => map.on('moveend', callback),
    zoomBy: delta => map.easeTo({ zoom: Math.min(config.maxZoom, Math.max(config.minZoom, map.getZoom() + delta)) }),
    flyTo: (center, zoom = 16) => { if (isInsideMoron(center)) map.flyTo({ center, zoom: Math.max(config.minZoom, zoom), duration: 1400, essential: false }); },
    home: () => map.fitBounds(config.homeBounds, { padding: { top: 55, bottom: 50, left: config.compactView ? 25 : innerWidth > 760 ? 350 : 30, right: 80 }, duration: 1100, pitch: 0, bearing: 0 }),
    north: () => map.easeTo({ bearing: 0 }),
    setLabels: enabled => labelIds.forEach(id => visible(id, enabled)),
    setBuildings: enabled => visible('tactical-building-footprints', enabled),
    setBoundaries: data => map.getSource('official-boundaries').setData(data),
    showBoundaries: enabled => ['boundary-fill', 'boundary-glow', 'boundary-line', 'moron-glow', 'moron-outline'].forEach(id => visible(id, enabled)),
    setIncidents: data => { activeIncidentPopup?.remove(); activeIncidentPopup = undefined; map.getSource('incidents').setData(data); },
    openIncident: feature => { activeIncidentPopup?.remove(); activeIncidentPopup = new mapboxgl.Popup({ maxWidth: '340px' }).setLngLat(feature.geometry.coordinates).setDOMContent(incidentPopup(feature)).addTo(map); },
    onMapClick: callback => map.on('click', event => callback([event.lngLat.lng, event.lngLat.lat])),
    clearSearchLocation: () => { searchMarker?.remove(); searchMarker = undefined; },
    setSearchLocation: (center, title = 'Dirección seleccionada') => {
      if (!isInsideMoron(center)) return;
      searchMarker?.remove();
      const element = document.createElement('div'); element.className = 'search-marker'; element.title = title;
      searchMarker = new mapboxgl.Marker({ element }).setLngLat(center).addTo(map);
    },
    setLocation: (center, accuracy) => {
      if (!isInsideMoron(center)) return;
      if (!marker) marker = new mapboxgl.Marker({ element: locationElement(), anchor: 'center' }).setLngLat(center).addTo(map);
      else marker.setLngLat(center);
      map.getSource('location-accuracy').setData(accuracyPolygon(center, accuracy));
    },
    clearLocation: () => { marker?.remove(); marker = undefined; map.getSource('location-accuracy').setData(emptyCollection()); },
    resize: () => map.resize(), destroy: () => map.remove(),
  };
  } catch (error) { map.remove(); throw error; }
}

function applyTacticalStyle(map) {
  for (const layer of map.getStyle().layers) {
    const id = layer.id;
    if (layer.type === 'background') map.setPaintProperty(id, 'background-color', '#06131e');
    if (layer.type === 'fill') {
      if (/water/.test(id)) map.setPaintProperty(id, 'fill-color', '#072537');
      else if (/building/.test(id)) map.setLayoutProperty(id, 'visibility', 'none');
      else if (/landuse|landcover|park|national/.test(id)) map.setPaintProperty(id, 'fill-color', '#0b202b');
    }
    if (layer.type === 'line' && /road|street|bridge|tunnel/.test(id)) {
      map.setPaintProperty(id, 'line-color', /case/.test(id) ? '#102e3b' : /motorway|trunk|primary/.test(id) ? '#51c8de' : '#238098');
      map.setPaintProperty(id, 'line-opacity', /tunnel/.test(id) ? .5 : .87);
    }
    if (layer.type === 'symbol') {
      if (/poi|transit|airport|ferry/.test(id)) map.setLayoutProperty(id, 'visibility', 'none');
      else if (layer.layout?.['text-field']) {
        map.setPaintProperty(id, 'text-color', /road/.test(id) ? '#9ad4e0' : '#bad7e1');
        map.setPaintProperty(id, 'text-halo-color', '#06131e');
        map.setPaintProperty(id, 'text-halo-width', 1.7);
      }
    }
  }
}
