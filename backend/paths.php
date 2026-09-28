<?php

declare(strict_types=1);

/**
 * Devuelve la carpeta base HTTP donde está instalado el proyecto.
 * Ejemplos:
 *   /moron-mapa-incidentes/api/incidents.php -> /moron-mapa-incidentes
 *   /api/incidents.php                       -> cadena vacía
 *
 * Esto permite descargar el repositorio dentro de cualquier subcarpeta de
 * htdocs sin tener que editar rutas a mano.
 */
function app_base_path(): string
{
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    $position = strpos($script, '/api/');

    if ($position === false) {
        return '';
    }

    return rtrim(substr($script, 0, $position), '/');
}

function app_url(string $path): string
{
    $path = '/' . ltrim($path, '/');
    return app_base_path() . $path;
}

function app_cookie_path(): string
{
    $base = app_base_path();
    return $base === '' ? '/' : $base . '/';
}
