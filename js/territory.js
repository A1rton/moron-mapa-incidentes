import { MORON_BOUNDARY } from './moron-boundary.js';
import { isCoordinate } from './geojson.js';

export { MORON_BOUNDARY };
const [west, south, east, north] = MORON_BOUNDARY.bbox;
export const MORON_BOUNDS = [[west, south], [east, north]];
// Margen de encuadre para celulares y el panel. El exterior sigue oculto.
export const NAVIGATION_BOUNDS = [[west - .045, south - .02], [east + .025, north + .02]];

function onSegment(point, a, b) {
  const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
  return Math.abs(cross) < 1e-12 && point[0] >= Math.min(a[0], b[0]) - 1e-10 &&
    point[0] <= Math.max(a[0], b[0]) + 1e-10 && point[1] >= Math.min(a[1], b[1]) - 1e-10 &&
    point[1] <= Math.max(a[1], b[1]) + 1e-10;
}

/** Incluye puntos sobre el límite. No confunde el rectángulo con el partido. */
export function isInsideMoron(point) {
  if (!isCoordinate(point) || point[0] < west || point[0] > east || point[1] < south || point[1] > north) return false;
  const ring = MORON_BOUNDARY.geometry.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    if (onSegment(point, a, b)) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** Máscara opaca: el mundo es el exterior y Morón es el único hueco. */
export function exteriorMask() {
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [
    [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
    [...MORON_BOUNDARY.geometry.coordinates[0]].reverse(),
  ] } };
}
