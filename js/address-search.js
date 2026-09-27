/** Búsqueda explícita: no envía consultas mientras se escribe. */
export function mountAddressSearch({ form, input, results, status, onSelect }) {
  let controller, revision = 0;
  input.addEventListener('input', () => { revision++; controller?.abort(); results.hidden = true; status.textContent = '';  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const query = input.value.trim();
    if (query.length < 3) return;
    controller?.abort(); controller = new AbortController(); const activeController = controller;
    const current = ++revision, button = form.querySelector('[type="submit"]');
    button.disabled = true; status.textContent = 'Buscando dentro de Morón…'; results.hidden = true;
    const timer = setTimeout(() => activeController.abort(), 16000);
    try {
      const response = await fetch(`/api/search.php?q=${encodeURIComponent(query)}`, { signal: activeController.signal });
      const raw = await response.text();
      let data;
      try { data = raw ? JSON.parse(raw) : {}; }
      catch { throw new Error(`El servidor devolvió una respuesta inválida (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(data.error || 'No se pudo buscar la dirección.');
      if (current !== revision) return;
      results.replaceChildren();
      for (const place of data.results) {
        const item = document.createElement('li'), choice = document.createElement('button');
        choice.type = 'button'; choice.textContent = place.label;
        choice.addEventListener('click', () => { input.value = place.address; results.hidden = true; status.textContent = 'Ubicación aproximada. Comprobá el punto en el mapa.'; onSelect(place); });
        item.append(choice); results.append(item);
      }
      results.hidden = !data.results.length;
      status.textContent = data.results.length ? 'Elegí la dirección que corresponde.' : 'No encontré esa dirección en Morón. Probá el nombre completo de la calle y la altura.';
    } catch (error) {
      if (current === revision) status.textContent = error.name === 'AbortError' ? 'La búsqueda tardó demasiado. Volvé a intentarlo.' : error.message;
    } finally { clearTimeout(timer); button.disabled = false; }
  });
}
