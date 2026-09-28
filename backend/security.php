<?php

declare(strict_types=1);

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/paths.php';

function now_ms(): int
{
    return (int) round(microtime(true) * 1000);
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

function read_json_body(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (!str_contains($contentType, 'application/json')) {
        json_response([
            'error' => 'Formato de solicitud no admitido.'
        ], 415);
    }

    $raw = file_get_contents('php://input');

    if ($raw === false || strlen($raw) > 8192) {
        json_response([
            'error' => 'Datos de solicitud inválidos.'
        ], 400);
    }

    $data = json_decode($raw, true);

    if (!is_array($data)) {
        json_response([
            'error' => 'Datos de solicitud inválidos.'
        ], 400);
    }

    return $data;
}

function request_origin(): string
{
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '';

    return $host === '' ? '' : $scheme . '://' . $host;
}

/**
 * Las escrituras administrativas deben venir del propio frontend.
 * El header personalizado evita formularios CSRF simples y, si el navegador
 * envía Origin/Sec-Fetch-Site, también se comprueba el origen.
 */
function require_moron_request(): void
{
    $header = $_SERVER['HTTP_X_MORON_REQUEST'] ?? '';

    if ($header !== '1') {
        json_response([
            'error' => 'Solicitud no autorizada. Recargá la página.'
        ], 403);
    }

    $fetchSite = strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($fetchSite !== '' && !in_array($fetchSite, ['same-origin', 'none'], true)) {
        json_response([
            'error' => 'Origen de solicitud no autorizado.'
        ], 403);
    }

    $origin = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
    $expected = rtrim(request_origin(), '/');

    if ($origin !== '' && $expected !== '' && !hash_equals($expected, $origin)) {
        json_response([
            'error' => 'Origen de solicitud no autorizado.'
        ], 403);
    }
}

function password_hash_moron(string $password): string
{
    $length = strlen($password);

    if ($length < 14 || $length > 128) {
        json_response([
            'error' => 'La contraseña debe tener entre 14 y 128 caracteres.'
        ], 400);
    }

    $salt = bin2hex(random_bytes(16));
    $hash = hash_pbkdf2('sha256', $password, $salt, 100000, 64, false);

    return "pbkdf2-sha256$100000$$salt$$hash";
}

function password_matches_moron(string $password, string $stored): bool
{
    if (strlen($password) > 128) {
        return false;
    }

    $parts = explode('$', $stored);

    if (count($parts) !== 4) {
        return false;
    }

    [$algorithm, $iterations, $salt, $expectedHash] = $parts;

    if ($algorithm !== 'pbkdf2-sha256' || $iterations !== '100000') {
        return false;
    }

    $actualHash = hash_pbkdf2('sha256', $password, $salt, 100000, 64, false);

    return hash_equals($expectedHash, $actualHash);
}

function client_rate_key(string $scope): string
{
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return $scope . ':' . hash('sha256', $remote);
}

/**
 * Límite persistente simple usando la tabla rate_limits.
 */
function enforce_rate_limit(
    string $scope,
    int $maximum,
    int $windowMs,
    string $message
): void {
    $pdo = db();
    $id = client_rate_key($scope);
    $now = now_ms();

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare("SELECT hits, expires_at FROM rate_limits WHERE id = ? FOR UPDATE");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            $stmt = $pdo->prepare("INSERT INTO rate_limits (id, hits, expires_at) VALUES (?, 1, ?)");
            $stmt->execute([$id, $now + $windowMs]);
        } elseif ((int) $row['expires_at'] <= $now) {
            $stmt = $pdo->prepare("UPDATE rate_limits SET hits = 1, expires_at = ? WHERE id = ?");
            $stmt->execute([$now + $windowMs, $id]);
        } elseif ((int) $row['hits'] >= $maximum) {
            $pdo->rollBack();
            json_response(['error' => $message], 429);
        } else {
            $stmt = $pdo->prepare("UPDATE rate_limits SET hits = hits + 1 WHERE id = ?");
            $stmt->execute([$id]);
        }

        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

function clear_rate_limit(string $scope): void
{
    $stmt = db()->prepare("DELETE FROM rate_limits WHERE id = ?");
    $stmt->execute([client_rate_key($scope)]);
}

function create_admin_session(): array
{
    $pdo = db();
    $rawToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);
    $csrf = bin2hex(random_bytes(32));
    $now = now_ms();
    $expires = $now + SESSION_DURATION_MS;

    $stmt = $pdo->prepare("DELETE FROM sessions WHERE expires_at <= ?");
    $stmt->execute([$now]);

    $stmt = $pdo->prepare("
        INSERT INTO sessions (token_hash, csrf_token, expires_at)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$tokenHash, $csrf, $expires]);

    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

    setcookie('moron_admin', $rawToken, [
        'expires' => time() + (8 * 60 * 60),
        'path' => app_cookie_path(),
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict'
    ]);

    return [
        'authenticated' => true,
        'csrf' => $csrf
    ];
}

function current_admin_session(): ?array
{
    $token = $_COOKIE['moron_admin'] ?? '';

    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
        return null;
    }

    $tokenHash = hash('sha256', $token);

    $stmt = db()->prepare("
        SELECT token_hash, csrf_token, expires_at
        FROM sessions
        WHERE token_hash = ? AND expires_at > ?
        LIMIT 1
    ");
    $stmt->execute([$tokenHash, now_ms()]);

    $session = $stmt->fetch();
    return $session ?: null;
}

function require_admin(bool $write = false): array
{
    $session = current_admin_session();

    if (!$session) {
        json_response([
            'error' => 'Tu sesión terminó. Volvé a ingresar.'
        ], 401);
    }

    if ($write) {
        $csrf = $_SERVER['HTTP_X_MORON_CSRF'] ?? '';

        if ($csrf === '' || !hash_equals($session['csrf_token'], $csrf)) {
            json_response([
                'error' => 'La sesión no coincide. Recargá la administración.'
            ], 403);
        }
    }

    return $session;
}

function delete_admin_session(): void
{
    $token = $_COOKIE['moron_admin'] ?? '';

    if (is_string($token) && preg_match('/^[a-f0-9]{64}$/', $token)) {
        $tokenHash = hash('sha256', $token);
        $stmt = db()->prepare("DELETE FROM sessions WHERE token_hash = ?");
        $stmt->execute([$tokenHash]);
    }

    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

    setcookie('moron_admin', '', [
        'expires' => time() - 3600,
        'path' => app_cookie_path(),
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
}
