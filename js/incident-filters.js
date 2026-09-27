import { INCIDENT_CATEGORIES } from './incident-categories.js';

/** Controles accesibles de selección múltiple. No agrega datos de demostración. */
export function mountIncidentFilters(onSelection) {
  const group = document.querySelector('#incident-filters');
  const inputs = new Map(), counts = new Map();
  for (const category of INCIDENT_CATEGORIES) {
    const label = document.createElement('label'); label.className = 'incident-filter';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = true;
    input.value = category.id; input.name = 'incident-category'; input.id = `category-${category.id}`;
    const swatch = document.createElement('span'); swatch.className = 'category-swatch';
    swatch.style.backgroundColor = category.color; swatch.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span'); name.textContent = category.label;
    const count = document.createElement('span'); count.className = 'category-count mono'; count.textContent = '0';
    count.setAttribute('aria-label', '0 incidentes cargados');
    label.append(input, swatch, name, count); group.append(label);
    inputs.set(category.id, input); counts.set(category.id, count);
    input.addEventListener('change', () => onSelection([...inputs].filter(([, element]) => element.checked).map(([id]) => id)));
  }
  const all = document.querySelector('#incidents-show-all'), none = document.querySelector('#incidents-hide-all');
  all.addEventListener('click', () => onSelection(INCIDENT_CATEGORIES.map(category => category.id)));
  none.addEventListener('click', () => onSelection([]));
  return summary => {
    group.disabled = false;
    for (const category of INCIDENT_CATEGORIES) {
      inputs.get(category.id).checked = summary.selectedCategories.includes(category.id);
      counts.get(category.id).textContent = String(summary.counts[category.id]);
      counts.get(category.id).setAttribute('aria-label', `${summary.counts[category.id]} incidentes cargados`);
    }
    all.disabled = summary.selectedCategories.length === INCIDENT_CATEGORIES.length;
    none.disabled = summary.selectedCategories.length === 0;
    document.querySelector('#incident-count').textContent = String(summary.visible).padStart(2, '0');
    document.querySelector('#incident-count').setAttribute('aria-label', `${summary.visible} incidentes visibles`);
    document.querySelector('#incidents-description').textContent = !summary.total ? 'Sin incidentes cargados.' :
      !summary.visible ? `Ningún incidente visible. Hay ${summary.total} cargados.` : `${summary.visible} de ${summary.total} incidentes visibles.`;
  };
}
