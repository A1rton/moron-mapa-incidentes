<?php

declare(strict_types=1);

/**
 * Configuración privada del backend.
 *
 * Para desarrollo local con XAMPP se usa el token de activación incluido abajo.
 * En un servidor público, definí la variable de entorno ADMIN_SETUP_TOKEN y
 * reemplazá el valor local antes de publicar el código.
 */

$setupTokenFromEnvironment = getenv('ADMIN_SETUP_TOKEN');

define(
    'ADMIN_SETUP_TOKEN',
    is_string($setupTokenFromEnvironment) && strlen($setupTokenFromEnvironment) >= 32
        ? $setupTokenFromEnvironment
        : 'abd7a7668be847a73bae4ada6fdc020e6f5d3b4e0ee2457ba2c51f65f2024ee8'
);

define('SESSION_DURATION_MS', 8 * 60 * 60 * 1000);
