<?php

declare(strict_types=1);

require_once __DIR__ . '/../../backend/security.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response([
        'error' => 'Método no permitido.'
    ], 405);
}

try {

    $session = current_admin_session();

    $stmt = db()->prepare("
        SELECT id
        FROM admins
        WHERE id = 1
        LIMIT 1
    ");

    $stmt->execute();

    $admin = $stmt->fetch();

    json_response([
        'authenticated' => $session !== null,
        'csrf' =>
            $session['csrf_token']
            ?? null,
        'setupRequired' => !$admin,
        'storage' => 'MySQL'
    ]);

} catch (Throwable $error) {

    json_response([
        'error' =>
            'No se pudo comprobar la sesión.'
    ], 500);
}