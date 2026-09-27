<?php

declare(strict_types=1);

require_once __DIR__ . '/../../backend/security.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Método no permitido.'], 405);
}

require_moron_request();

enforce_rate_limit(
    'admin-login',
    10,
    15 * 60 * 1000,
    'Demasiados intentos de acceso. Esperá unos minutos y volvé a intentar.'
);

try {
    $data = read_json_body();
    $password = $data['password'] ?? '';

    if (!is_string($password)) {
        json_response(['error' => 'No se pudo ingresar. Revisá la contraseña.'], 401);
    }

    $stmt = db()->prepare("
        SELECT password_hash
        FROM admins
        WHERE id = 1
        LIMIT 1
    ");
    $stmt->execute();
    $admin = $stmt->fetch();

    if (!$admin || !password_matches_moron($password, $admin['password_hash'])) {
        json_response(['error' => 'No se pudo ingresar. Revisá la contraseña.'], 401);
    }

    clear_rate_limit('admin-login');
    json_response(create_admin_session());

} catch (Throwable $error) {
    json_response(['error' => 'No se pudo iniciar sesión.'], 500);
}
