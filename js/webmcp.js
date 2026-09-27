/** Mejora progresiva opcional: leer la misma cámara que muestra la interfaz. */
export function registerMapTools(engine) {
  if (!document.modelContext?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', event => { if (!event.persisted) lifecycle.abort(); }, { once: true });
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'read_moron_map_view', title: 'Leer vista del mapa',
      description: 'Lee el centro y zoom actuales del mapa, visibles en la barra inferior. No solicita ubicación ni cambia el mapa.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new TypeError('Se espera un objeto vacío.');
        return { engine: engine.name, ...engine.getView() };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
  } catch { /* El mapa funciona sin WebMCP. */ }
}
