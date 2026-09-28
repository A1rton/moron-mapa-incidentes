<?php

declare(strict_types=1);

/**
 * Configuración privada del backend.
 *
 * En desarrollo local con XAMPP se permite el token de activación
 * documentado en ADMIN-NOTA.txt.
 *
 * En un servidor público se debe definir la variable de entorno:
 * ADMIN_SETUP_TOKEN
 */

$setupTokenFromEnvironment = getenv('ADMIN_SETUP_TOKEN');

$host = strtolower($_SERVER['HTTP_HOST'] ?? 'localhost');
$host = preg_replace('/:\d+$/', '', $host);

$isLocalEnvironment = in_array(
    $host,
    ['localhost', '127.0.0.1', '::1'],
    true
);

$localSetupToken =
    'abd7a7668be847a73bae4ada6fdc020e6f5d3b4e0ee2457ba2c51f65f2024ee8';


if (
    is_string($setupTokenFromEnvironment)
    && strlen($setupTokenFromEnvironment) >= 32
) {
    define('ADMIN_SETUP_TOKEN', $setupTokenFromEnvironment);
    define('ADMIN_SETUP_ENABLED', true);

} elseif ($isLocalEnvironment) {

    define('ADMIN_SETUP_TOKEN', $localSetupToken);
    define('ADMIN_SETUP_ENABLED', true);

} else {

    /*
     * En un servidor público sin variable de entorno,
     * la activación queda bloqueada.
     */
    define('ADMIN_SETUP_TOKEN', '');
    define('ADMIN_SETUP_ENABLED', false);
}


define(
    'SESSION_DURATION_MS',
    8 * 60 * 60 * 1000
);