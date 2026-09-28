<!doctype html>
<html lang="es-AR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#050e17">
  <meta name="description" content="Explorá Morón con un mapa interactivo, detalle de calles, edificios y tu ubicación.">
  <title>Morón · Mapa territorial</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23050e17'/%3E%3Cpath d='M7 24V8l9 10 9-10v16' fill='none' stroke='%234be7f0' stroke-width='3'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://tiles.openfreemap.org">
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <a href="#map" class="skip-link">Ir al mapa</a>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Morón, mapa territorial">
      <span class="brand-mark" aria-hidden="true">M<span>+</span></span>
      <span class="brand-name">MORÓN<span>MAPA TERRITORIAL</span></span>
    </a>
    <div class="topbar-place"><span class="crosshair-icon" aria-hidden="true"></span> Partido de Morón <span class="separator"></span><span class="mono">34°39′ S &nbsp; 58°37′ O</span></div>
    <div class="connection" id="connection"><span></span><span id="connection-text">Cargando mapa</span></div>
  </header>

  <main class="workspace">
    <div id="map" tabindex="0" role="region" aria-label="Mapa interactivo de Morón. Usá las flechas para desplazarte y los controles para acercar o alejar."></div>
    <div class="map-grid" aria-hidden="true"></div>
    <div class="map-vignette" aria-hidden="true"></div>

    <aside class="panel" aria-label="Controles del mapa">
      <div class="panel-heading"><span class="eyebrow">EXPLORADOR TERRITORIAL</span><span class="panel-index mono">01 / BA</span></div>
      <h1>Partido de<br><span>Morón.</span></h1>
      <p class="panel-intro">Exploración limitada al partido de Morón.</p>
      <button class="home-button" id="home-button" type="button"><span aria-hidden="true">⌖</span> Vista del partido <span aria-hidden="true">↗</span></button>
      <form id="address-search" class="address-search" role="search">
        <label for="address-query">Buscar una dirección</label>
        <div class="search-entry"><input id="address-query" type="search" disabled placeholder="Ej.: Leandro Alem 1678" maxlength="160" minlength="3" required autocomplete="off"><button type="submit" aria-label="Buscar dirección" disabled>Buscar</button></div>
        <p id="search-status" role="status"></p>
        <ul id="search-results" class="search-results" aria-label="Resultados en Morón" hidden></ul>
        <span class="search-credit">Direcciones: <a href="https://www.argentina.gob.ar/georef" target="_blank" rel="noopener">Georef</a> · ubicación aproximada</span>
      </form>
      <div class="section-divider"></div>
      <section class="incidents-section" aria-labelledby="incidents-title">
        <div class="section-title"><h2 id="incidents-title">INCIDENTES EN EL MAPA</h2><span class="incident-count mono" id="incident-count" aria-label="Incidentes visibles">00</span></div>
        <p class="filter-help">Elegí qué tipos querés ver.</p>
        <fieldset id="incident-filters" disabled aria-describedby="incidents-description">
          <legend class="sr-only">Tipos de incidentes visibles</legend>
        </fieldset>
        <div class="filter-actions" role="group" aria-label="Selección de incidentes">
          <button id="incidents-show-all" type="button" disabled>Mostrar todos</button>
          <button id="incidents-hide-all" type="button" disabled>Ocultar todos</button>
        </div>
        <p id="incidents-description" aria-live="polite" aria-atomic="true">Sin incidentes cargados.</p>
      </section>
      <div class="section-divider"></div>
      <section class="location-section" aria-labelledby="location-title">
        <div class="section-title"><h2 id="location-title">TU UBICACIÓN</h2><span class="status-label" id="location-state">POR CONFIRMAR</span></div>
        <p id="location-description" aria-live="polite">Permití el acceso para ubicarte en el mapa.</p>
        <button class="location-button" id="location-button" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg><span>Usar mi ubicación</span></button>
        <label class="layer-row"><span>Ubicación en tiempo real</span><input id="live-location-toggle" type="checkbox"><span class="switch" aria-hidden="true"></span></label>
        <div class="proximity-settings"><label for="alert-radius">Avisarme a menos de</label><select id="alert-radius"><option value="200">200 m</option><option value="500" selected>500 m</option><option value="1000">1 km</option></select></div>
        <p id="proximity-status" class="proximity-status" aria-live="polite">Activá la ubicación en tiempo real para recibir avisos.</p>
        <p class="tracking-note">Avisos para los tipos seleccionados mientras el mapa está abierto. Nuevos reportes cada 30 s. Tu recorrido no se guarda.</p>
      </section>
      <div class="section-divider"></div>
      <section class="layers" aria-labelledby="layers-title">
        <div class="section-title"><h2 id="layers-title">CAPAS DEL MAPA</h2><span class="mono small">VISIBILIDAD</span></div>
        <label class="layer-row"><span class="layer-swatch roads"></span><span>Nombres de calles</span><input id="labels-toggle" type="checkbox" checked><span class="switch" aria-hidden="true"></span></label>
        <label class="layer-row"><span class="layer-swatch buildings"></span><span>Edificios</span><input id="buildings-toggle" type="checkbox" checked><span class="switch" aria-hidden="true"></span></label>
        <p class="layer-note" id="buildings-note">Huellas disponibles al acercar.</p>
        <label class="layer-row"><span class="layer-swatch boundaries"></span><span>Límite de Morón</span><input id="boundaries-toggle" type="checkbox" checked><span class="switch" aria-hidden="true"></span></label>
        <p class="layer-note" id="boundaries-note">Contorno de Morón · Georef / Datos Argentina.</p>
      </section>
      <div class="panel-footer"><span class="legend-dot"></span><span>Tu ubicación</span><span class="mono" id="engine-label">INICIANDO</span></div>
      <a class="admin-link" href="./admin/">Administrar incidentes ↗</a>
    </aside>

    <div class="map-heading"><span class="eyebrow">ÁREA DE EXPLORACIÓN</span><span>PARTIDO DE MORÓN</span></div>
    <div class="map-controls" role="group" aria-label="Navegación del mapa">
      <button id="north-button" type="button" title="Orientar al norte" aria-label="Orientar al norte"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="north-fill" d="m12 3 6 16-6-3-6 3z"/></svg><span class="north-label">N</span></button>
      <span class="control-divider"></span>
      <button id="zoom-in" type="button" title="Acercar" aria-label="Acercar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button>
      <button id="zoom-out" type="button" title="Alejar" aria-label="Alejar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button>
      <span class="control-divider"></span>
      <button id="locate-control" type="button" title="Centrar en mi ubicación" aria-label="Centrar en mi ubicación"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg></button>
    </div>
    <div class="map-hint" id="map-hint"><span aria-hidden="true">⌕</span> Acercá el mapa para explorar calles y edificios.</div>
    <div class="toast" id="toast" role="status" hidden></div>
    <div class="nearby-alert" id="nearby-alert" role="alert" hidden><button type="button" id="dismiss-nearby" aria-label="Cerrar aviso">×</button><strong id="nearby-title">Incidente cerca</strong><p id="nearby-message"></p><button type="button" id="nearby-view">Ver en el mapa</button></div>
    <div class="fatal-error" id="fatal-error" role="alert" hidden><h2>No se pudo cargar el mapa</h2><p>Revisá tu conexión e intentá nuevamente.</p><button id="reload-button" type="button">Reintentar</button></div>
    <button class="mobile-panel-button" id="mobile-panel-button" type="button" aria-controls="map-panel" aria-expanded="false">Incidentes y mapa <span aria-hidden="true">↑</span></button>
  </main>
  <footer class="statusbar"><span class="statusbar-label">CENTRO DEL MAPA</span><span class="mono" id="center-coordinates">−34.65090, −58.61980</span><span class="statusbar-zoom mono">ZOOM <strong id="zoom-level">13.3</strong></span><span class="statusbar-detail" id="detail-level">Vista territorial</span><span class="statusbar-end">MORÓN <span class="plus">+</span></span></footer>
  <noscript><div class="noscript">Activá JavaScript para usar el mapa interactivo.</div></noscript>
  <script type="module" src="./js/app.js"></script>
</body>
</html>
