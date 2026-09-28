/** Utilidades compartidas. GeoJSON siempre usa [longitud, latitud]. */
export const emptyCollection = () => ({ type: 'FeatureCollection', features: [] });

export function isCoordinate(value) {
  return Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}

export function validateCollection(data, allowedTypes) {
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new TypeError('Se requiere un GeoJSON FeatureCollection.');
  }
  const validRing = ring => Array.isArray(ring) && ring.length >= 4 && ring.every(isCoordinate) &&
    ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
  const validPolygon = polygon => Array.isArray(polygon) && polygon.length > 0 && polygon.every(validRing);
  for (const feature of data.features) {
    const g = feature?.geometry;
    if (feature?.type !== 'Feature' || !g || !allowedTypes.includes(g.type)) {
      throw new TypeError(`Geometría no válida. Tipos admitidos: ${allowedTypes.join(', ')}.`);
    }
    const valid = g.type === 'Point' ? isCoordinate(g.coordinates) :
      g.type === 'Polygon' ? validPolygon(g.coordinates) :
      Array.isArray(g.coordinates) && g.coordinates.length > 0 && g.coordinates.every(validPolygon);
    if (!valid) throw new TypeError('Coordenadas GeoJSON inválidas; verificá WGS84 y el cierre de los anillos.');
  }
  return data;
}

/** Círculo geodésico para la precisión aproximada de la ubicación HTML5. */
export function accuracyPolygon([lng, lat], meters) {
  const r = Math.max(0, meters) / 6371008.8;
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  const ring = [];
  for (let i = 0; i < 64; i++) {
    const bearing = i * 2 * Math.PI / 64;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(r) + Math.cos(lat1) * Math.sin(r) * Math.cos(bearing));
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(r) * Math.cos(lat1), Math.cos(r) - Math.sin(lat1) * Math.sin(lat2));
    ring.push([((lng2 * 180 / Math.PI + 540) % 360) - 180, lat2 * 180 / Math.PI]);
  }
  ring.push([...ring[0]]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

/** Texto del servidor siempre como texto: evita inyección HTML en popups. */
export function incidentPopup(feature) {
  const box = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'popup-title';
  title.textContent = String(feature.properties?.title || 'Incidente');
  box.append(title);
  for (const key of ['category', 'address', 'description']) {
    if (!feature.properties?.[key]) continue;
    const text = document.createElement('p');
    text.className = 'popup-detail';
    text.textContent = String(feature.properties[key]);
    box.append(text);
  }
  const [lng, lat] = feature.geometry.coordinates;
  const coordinates = document.createElement('p'); coordinates.className = 'popup-coordinates mono';
  coordinates.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; box.append(coordinates);
  const photo = feature.properties?.photoUrl;
  let photoUrl = null;
  if (typeof photo === 'string') {
    try {
      const candidate = new URL(photo, location.href);
      const id = candidate.searchParams.get('id') || '';
      if (candidate.origin === location.origin && /\/api\/photos\.php$/i.test(candidate.pathname) && /^[a-f0-9-]{36}$/i.test(id)) {
        photoUrl = candidate.href;
      }
    } catch { /* URL inválida: se muestra el estado sin foto. */ }
  }
  if (photoUrl) {
    const image = document.createElement('img'); image.className = 'incident-photo'; image.loading = 'lazy';
    image.src = photoUrl; image.alt = `Foto del lugar: ${feature.properties.address || feature.properties.title || 'incidente'}`;
    image.addEventListener('error', () => { image.hidden = true; const note = document.createElement('p'); note.textContent = 'No se pudo cargar la foto.'; box.append(note); }, { once: true });
    box.append(image);
  } else {
    const note = document.createElement('p'); note.className = 'popup-detail'; note.textContent = 'Sin foto disponible.'; box.append(note);
  }
  return box;
}

export function locationElement() {
  const element = document.createElement('div');
  element.className = 'user-marker';
  element.setAttribute('aria-label', 'Tu ubicación');
  element.innerHTML = '<span class="pulse-ring"></span><span class="pulse-ring"></span><span class="pulse-core"></span><span class="user-marker-label">Tu ubicación</span>';
  return element;
}
