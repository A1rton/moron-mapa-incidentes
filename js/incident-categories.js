/** Catálogo único para filtros, colores de pines e integración de la API. */
export const INCIDENT_CATEGORIES = Object.freeze([
  { id: 'transito', label: 'Tránsito', color: '#4be7f0' },
  { id: 'alumbrado', label: 'Alumbrado', color: '#f8d675' },
  { id: 'calles', label: 'Calles y veredas', color: '#ffa566' },
  { id: 'residuos', label: 'Residuos', color: '#aeff68' },
  { id: 'seguridad', label: 'Seguridad', color: '#fa8bad' },
  { id: 'otros', label: 'Otros', color: '#bcc8e9' },
]);

export function categoryFor(feature) {
  const value = String(feature.properties?.categoryId ?? feature.properties?.category ?? 'otros')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const aliases = { 'calles y veredas': 'calles', 'infraestructura': 'calles', 'basura': 'residuos', 'iluminacion': 'alumbrado' };
  return INCIDENT_CATEGORIES.find(category => category.id === (aliases[value] || value)) || INCIDENT_CATEGORIES.at(-1);
}
