<?php

declare(strict_types=1);

require_once __DIR__ . '/../backend/database.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Método no permitido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$id = $_GET['id'] ?? '';

if (!is_string($id) || !preg_match('/^[a-f0-9-]{36}$/i', $id)) {
    http_response_code(400);

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'error' => 'ID de fotografía inválido.'
    ]);

    exit;
}

try {
    $pdo = db();

    $stmt = $pdo->prepare("
        SELECT
            p.mime,
            p.bytes
        FROM photo_blobs AS p

        INNER JOIN incidents AS i
            ON i.photo_id = p.id

        WHERE p.id = :id
          AND i.status <> 'archived'

        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id
    ]);

    $photo = $stmt->fetch();

    if (!$photo) {
        http_response_code(404);

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode([
            'error' => 'Fotografía no encontrada.'
        ]);

        exit;
    }

    $allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (!in_array($photo['mime'], $allowedMimeTypes, true)) {
        http_response_code(500);

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode([
            'error' => 'Formato de fotografía no válido.'
        ]);

        exit;
    }

    header('Content-Type: ' . $photo['mime']);
    header('Content-Length: ' . strlen($photo['bytes']));
    header('Cache-Control: no-store');

    echo $photo['bytes'];

} catch (Throwable $error) {
    http_response_code(500);

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'error' => 'No se pudo cargar la fotografía.'
    ]);
}