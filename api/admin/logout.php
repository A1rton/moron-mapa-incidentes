<?php

declare(strict_types=1);

require_once __DIR__ . '/../../backend/security.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response([
        'error' => 'Método no permitido.'
    ], 405);
}

require_moron_request();

require_admin(true);

delete_admin_session();

json_response([
    'ok' => true
]);