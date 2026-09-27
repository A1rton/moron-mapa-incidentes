import { emptyCollection, validateCollection } from './geojson.js';
import { isInsideMoron } from './territory.js';
import { INCIDENT_CATEGORIES, categoryFor } from './incident-categories.js';

/** PUNTO DE EXTENSIÓN 1: incidentes.
 * setData acepta FeatureCollection de Point; add agrega o reemplaza por id.
 * La API trabaja igual en Mapbox y Leaflet. Los datos viven solo en memoria.
 */
export class IncidentStore {
  constructor(engine, onChange) {
    this.engine = engine; this.onChange = onChange; this.data = emptyCollection();
    this.selectedCategories = new Set(INCIDENT_CATEGORIES.map(category => category.id));
  }
  setData(collection) {
    validateCollection(collection, ['Point']);
    const seen = new Set();
    for (const feature of collection.features) {
      if (!isInsideMoron(feature.geometry.coordinates)) throw new RangeError('El incidente está fuera del partido de Morón.');
      const id = feature.id ?? feature.properties?.id;
      if (id == null || !['string', 'number'].includes(typeof id)) throw new TypeError('Cada incidente necesita un id de texto o número.');
      if (seen.has(String(id))) throw new TypeError('Los ids de los incidentes deben ser únicos.');
      seen.add(String(id));
    }
    this.data = structuredClone(collection);
    for (const feature of this.data.features) {
      const category = categoryFor(feature);
      feature.properties = { ...feature.properties, categoryId: category.id, categoryColor: category.color };
    }
    this.render();
  }
  add(feature) {
    validateCollection({ type: 'FeatureCollection', features: [feature] }, ['Point']);
    const id = feature.id ?? feature.properties?.id;
    const features = this.data.features.filter(f => String(f.id ?? f.properties?.id) !== String(id));
    this.setData({ type: 'FeatureCollection', features: [...features, feature] });
  }
  remove(id) { this.setData({ type: 'FeatureCollection', features: this.data.features.filter(f => String(f.id ?? f.properties?.id) !== String(id)) }); }
  clear() { this.setData(emptyCollection()); }
  /** Cambia visibilidad; nunca elimina reportes. [] oculta todas las categorías. */
  setCategories(ids) {
    const allowed = INCIDENT_CATEGORIES.map(category => category.id);
    if (!Array.isArray(ids) || ids.some(id => !allowed.includes(id))) throw new TypeError('Categorías de incidentes inválidas.');
    this.selectedCategories = new Set(ids); this.render();
  }
  getSummary() {
    const counts = Object.fromEntries(INCIDENT_CATEGORIES.map(category => [category.id, 0]));
    let visible = 0;
    for (const feature of this.data.features) {
      const id = feature.properties.categoryId; counts[id]++;
      if (this.selectedCategories.has(id)) visible++;
    }
    return { total: this.data.features.length, visible, counts, selectedCategories: [...this.selectedCategories] };
  }
  render() {
    const visible = { type: 'FeatureCollection', features: this.data.features.filter(feature => this.selectedCategories.has(feature.properties.categoryId)) };
    this.engine.setIncidents(visible);
    this.onChange(this.getSummary(), visible);
  }
}
