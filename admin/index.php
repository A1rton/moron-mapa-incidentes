<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#050e17"><meta name="robots" content="noindex,nofollow"><title>Administración · Morón</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23050e17'/%3E%3Cpath d='M7 24V8l9 10 9-10v16' fill='none' stroke='%234be7f0' stroke-width='3'/%3E%3C/svg%3E">
<link rel="stylesheet" href="../styles.css">
</head>
<body class="admin-page">
<header class="topbar"><a class="brand" href="../"><span class="brand-mark" aria-hidden="true">M<span>+</span></span><span class="brand-name">MORÓN<span>ADMINISTRACIÓN</span></span></a><a class="return-map" href="../">Volver al mapa ↗</a><button id="logout" class="subtle-button" type="button" hidden>Cerrar sesión</button></header>
<main class="admin-scroll">
<section id="admin-auth" class="auth-card" aria-labelledby="auth-title">
<span class="eyebrow">GESTIÓN DE INCIDENTES</span><h1 id="auth-title">Administración</h1><p id="auth-description">Comprobando acceso…</p>
<form id="auth-form" hidden><label for="admin-password">Contraseña</label><input id="admin-password" type="password" required maxlength="128" autocomplete="current-password"><div id="confirm-password-row" hidden><label for="confirm-password">Repetir contraseña</label><input id="confirm-password" type="password" maxlength="128" autocomplete="new-password"></div><button id="auth-submit" class="primary-button" type="submit">Ingresar</button></form>
<p id="auth-status" role="status"></p>
</section>
<section id="admin-workspace" hidden>
<div class="admin-heading"><div><span class="eyebrow">PARTIDO DE MORÓN</span><h1>Gestión de incidentes</h1><p>Los incidentes activos y sus fotos se muestran en el mapa público.</p></div><button id="new-incident" type="button" class="primary-button">+ Nuevo incidente</button></div>
<p id="admin-status" class="admin-status" role="status"></p>
<div class="admin-grid">
<aside class="records-panel"><div class="records-heading"><h2>Incidentes <span id="record-count">0</span></h2><button id="refresh-records" type="button" class="subtle-button">Actualizar</button></div><div id="incident-records"><p>Cargando incidentes…</p></div></aside>
<section class="editor-panel" aria-labelledby="editor-title"><h2 id="editor-title">Nuevo incidente</h2>
<form id="admin-search" class="address-search" role="search"><label for="admin-search-query">Ubicar la calle y altura</label><div class="search-entry"><input id="admin-search-query" type="search" placeholder="Ej.: Leandro Alem 1678" minlength="3" maxlength="160" required autocomplete="off"><button type="submit">Buscar</button></div><p id="admin-search-status" role="status"></p><ul id="admin-search-results" class="search-results" hidden></ul><span class="search-credit">Direcciones: <a href="https://www.argentina.gob.ar/georef" target="_blank" rel="noopener">Georef</a> · ubicación aproximada</span></form>
<div class="admin-map-wrap"><div id="map" role="region" tabindex="0" aria-label="Seleccionar la ubicación del incidente dentro de Morón"></div><div class="admin-map-buttons"><button id="admin-zoom-in" type="button" aria-label="Acercar">+</button><button id="admin-zoom-out" type="button" aria-label="Alejar">−</button><button id="admin-map-home" type="button">Morón</button></div><span id="admin-map-loading">Cargando mapa…</span></div>
<p id="selected-coordinates" class="coordinate-note" aria-live="polite">Buscá una dirección o tocá el punto del incidente en el mapa.</p>
<form id="incident-form"><fieldset id="incident-fields">
<label for="incident-title">Título</label><input id="incident-title" type="text" minlength="3" maxlength="120" required placeholder="Ej.: luminaria apagada">
<div class="form-columns"><div><label for="incident-category">Tipo de incidente</label><select id="incident-category" required></select></div><div><label for="incident-status">Estado</label><select id="incident-status"><option value="active">Activo</option><option value="resolved">Resuelto</option></select></div></div>
<label for="incident-address">Dirección (calle y altura)</label><input id="incident-address" type="text" minlength="5" maxlength="220" required placeholder="Dirección del punto seleccionado">
<label for="incident-description">Información del incidente</label><textarea id="incident-description" minlength="5" maxlength="3000" rows="5" required placeholder="Qué sucede y qué necesita saber quien pase por el lugar"></textarea>
<label for="incident-photo">Foto de la calle o del lugar</label><input id="incident-photo" type="file" accept="image/jpeg,image/png,image/webp" required><p class="field-help">Usá una foto real del lugar. Se preparará para mostrarla en el mapa.</p><img id="photo-preview" class="photo-preview" alt="Foto del lugar que se publicará" hidden>
<div class="editor-actions"><button id="save-incident" class="primary-button" type="submit">Publicar incidente</button><button id="archive-incident" class="danger-button" type="button" hidden>Retirar del mapa</button></div>
</fieldset></form>
</section>
</div>
</section>
</main>
<script type="module" src="../js/admin.js"></script>
</body>
</html>
