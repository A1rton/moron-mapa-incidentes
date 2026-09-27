import { incidentPopup, locationElement } from './geojson.js';
import { FootprintLayer } from './footprints.js';
import { MORON_BOUNDARY, exteriorMask, isInsideMoron } from './territory.js';
import { createPublicBasemap } from './public-basemap.js';

/** Alternativa sin token: Leaflet + OpenFreeMap. OSM raster como respaldo. */
export async function createLeafletEngine(config, report, onFootprintStatus) {
  const map = L.map('map', { zoomControl: false, zoomSnap: .1, zoomDelta: .5,
    minZoom: config.minZoom, maxZoom: config.maxZoom, preferCanvas: true,
    maxBounds: config.navigationBounds.map(([lng, lat]) => [lat, lng]), maxBoundsViscosity: 1, bounceAtZoomLimits: false,
    scrollWheelZoom: true, wheelPxPerZoomLevel: 100 }).setView([config.center[1], config.center[0]], config.zoom);
  const basemap = await createPublicBasemap(map, config, report);
  map.attributionControl.addAttribution('<a href="https://datosgobar.github.io/georef-ar-api/shapefiles/" target="_blank" rel="noopener">Límite: Georef</a>');
  L.control.scale({ position: 'bottomleft', metric: true, imperial: false, maxWidth: 100 }).addTo(map);
  const footprints = basemap.vector ? null : new FootprintLayer(map, config.footprints, onFootprintStatus);
  if (basemap.vector) onFootprintStatus('Huellas de edificios al acercar · OpenStreetMap.');
  const boundaries = L.layerGroup().addTo(map);
  // La máscara está por encima de las teselas, etiquetas y huellas.
  map.createPane('territoryMask'); map.getPane('territoryMask').style.zIndex = 475;
  map.getPane('territoryMask').style.pointerEvents = 'none';
  const territoryRenderer = L.svg({ pane: 'territoryMask', padding: 1 });
  L.geoJSON(exteriorMask(), { pane: 'territoryMask', renderer: territoryRenderer, interactive: false,
    style: { stroke: false, fillColor: '#050e17', fillOpacity: 1, fillRule: 'evenodd' } }).addTo(map);
  const territoryOutline = L.layerGroup().addTo(map);
  for (const style of [{ color: '#4be7f0', weight: 9, opacity: .16 }, { color: '#75f4fc', weight: 1.8, opacity: 1 }]) {
    L.geoJSON(MORON_BOUNDARY, { pane: 'territoryMask', renderer: territoryRenderer, interactive: false,
      style: { ...style, fill: false } }).addTo(territoryOutline);
  }
  const incidents = L.geoJSON(null, { pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 7, color: '#fff1ce', weight: 2, fillColor: feature.properties?.categoryColor || '#ffa566', fillOpacity: 1, className: 'incident-pin' }),
    onEachFeature: (feature, layer) => layer.bindPopup(incidentPopup(feature)) }).addTo(map);
  let marker, accuracyCircle, searchMarker;
  return {
    name: 'LEAFLET', supportsLabelToggle: basemap.vector,
    getView: () => ({ center: [map.getCenter().lng, map.getCenter().lat], zoom: map.getZoom() }),
    onMove: callback => map.on('moveend zoomend', callback),
    zoomBy: delta => map.setZoom(Math.min(config.maxZoom, Math.max(config.minZoom, map.getZoom() + delta)), { animate: true }),
    flyTo: (center, zoom = 16) => { if (isInsideMoron(center)) map.flyTo([center[1], center[0]], Math.max(config.minZoom, zoom), { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 1.2 }); },
    home: () => map.fitBounds(config.homeBounds.map(([lng, lat]) => [lat, lng]), { paddingTopLeft: [config.compactView ? 25 : innerWidth > 760 ? 350 : 25, 55], paddingBottomRight: [80, 65], animate: true }),
    north: () => report('El mapa 2D ya está orientado al norte.'),
    setLabels: enabled => basemap.setLabels(enabled),
    setBuildings: enabled => { basemap.setBuildings(enabled); footprints?.setVisible(enabled); },
    setBoundaries: data => {
      boundaries.clearLayers();
      L.geoJSON(data, { interactive: false, style: { color: '#4be7f0', weight: 9, opacity: .13, fillOpacity: 0 } }).addTo(boundaries);
      L.geoJSON(data, { interactive: false, style: { color: '#75f4fc', weight: 1.7, opacity: .95, fillColor: '#39d3e2', fillOpacity: .025 } }).addTo(boundaries);
    },
    showBoundaries: enabled => { if (enabled) { boundaries.addTo(map); territoryOutline.addTo(map); } else { boundaries.remove(); territoryOutline.remove(); } },
    setIncidents: data => { incidents.clearLayers(); incidents.addData(data); },
    openIncident: feature => L.popup({ maxWidth: 320 }).setLatLng([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]).setContent(incidentPopup(feature)).openOn(map),
    onMapClick: callback => map.on('click', event => callback([event.latlng.lng, event.latlng.lat])),
    clearSearchLocation: () => { searchMarker?.remove(); searchMarker = undefined; },
    setSearchLocation: (center, title = 'Dirección seleccionada') => {
      if (!isInsideMoron(center)) return;
      searchMarker?.remove();
      searchMarker = L.circleMarker([center[1], center[0]], { radius: 9, weight: 3, color: '#fff', fillColor: '#4be7f0', fillOpacity: 1 }).addTo(map);
      const label = document.createElement('span'); label.textContent = title;
      searchMarker.bindTooltip(label, { permanent: false, direction: 'top' });
    },
    setLocation: (center, accuracy) => {
      if (!isInsideMoron(center)) return;
      const latlng = [center[1], center[0]];
      if (!accuracyCircle) accuracyCircle = L.circle(latlng, { radius: accuracy, color: '#aeff68', weight: 1, opacity: .35, fillColor: '#aeff68', fillOpacity: .065, interactive: false }).addTo(map);
      else accuracyCircle.setLatLng(latlng).setRadius(accuracy);
      if (!marker) marker = L.marker(latlng, { icon: L.divIcon({ html: locationElement(), className: '', iconSize: [24, 24], iconAnchor: [12, 12] }), title: 'Tu ubicación', alt: 'Tu ubicación', zIndexOffset: 1000 }).addTo(map);
      else marker.setLatLng(latlng);
    },
    clearLocation: () => { marker?.remove(); accuracyCircle?.remove(); marker = undefined; accuracyCircle = undefined; },
    resize: () => map.invalidateSize(), destroy: () => { footprints?.destroy(); map.remove(); },
  };
}
