<?php

declare(strict_types=1);

require_once __DIR__ . '/../../backend/security.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Método no permitido.'], 405);
}

require_moron_request();

enforce_rate_limit(
    'admin-setup',
    10,
    15 * 60 * 1000,
    'Demasiados intentos de activación. Esperá unos minutos y volvé a intentar.'
);

try {
    $data = read_json_body();
    $password = $data['password'] ?? '';
    $setupToken = $data['setupToken'] ?? '';

    $stmt = db()->prepare("SELECT id FROM admins WHERE id = 1 LIMIT 1");
    $stmt->execute();

    if ($stmt->fetch()) {
        json_response([
            'error' => 'La administración ya tiene una contraseña. Ingresá con ella.'
        ], 409);
    }

    if (!is_string($setupToken) || !hash_equals(ADMIN_SETUP_TOKEN, $setupToken)) {
        json_response([
            'error' => 'Necesitás el enlace privado de activación de la administración.'
        ], 403);
    }

    if (!is_string($password)) {
        json_response(['error' => 'La contraseña no es válida.'], 400);
    }

    $hash = password_hash_moron($password);

    $stmt = db()->prepare("
        INSERT INTO admins (id, password_hash, created_at)
        VALUES (1, ?, ?)
    ");
    $stmt->execute([$hash, now_ms()]);

    clear_rate_limit('admin-setup');
    json_response(create_admin_session());

} catch (PDOException $error) {
    json_response(['error' => 'No se pudo activar la administración.'], 500);
}
