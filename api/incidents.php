<?php

declare(strict_types=1);

require_once __DIR__ . '/../backend/database.php';
require_once __DIR__ . '/../backend/paths.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = db();

    $stmt = $pdo->prepare("
        SELECT
            id,
            title,
            category_id,
            address,
            description,
            longitude,
            latitude,
            status,
            photo_id,
            photo_mime,
            photo_size,
            created_at,
            updated_at,
            version
        FROM incidents
        WHERE status = 'active'
        ORDER BY updated_at DESC
    ");

    $stmt->execute();

    $rows = $stmt->fetchAll();

    $categoryNames = [
        'transito' => 'Tránsito',
        'alumbrado' => 'Alumbrado',
        'calles' => 'Calles y veredas',
        'residuos' => 'Residuos',
        'seguridad' => 'Seguridad',
        'otros' => 'Otros'
    ];

    $features = [];

    foreach ($rows as $row) {
        $categoryId = $row['category_id'];

        $features[] = [
            'type' => 'Feature',
            'id' => $row['id'],

            'geometry' => [
                'type' => 'Point',
                'coordinates' => [
                    (float) $row['longitude'],
                    (float) $row['latitude']
                ]
            ],

            'properties' => [
                'id' => $row['id'],
                'title' => $row['title'],
                'categoryId' => $categoryId,
                'category' => $categoryNames[$categoryId] ?? $categoryId,
                'address' => $row['address'],
                'description' => $row['description'],
                'status' => $row['status'],
                'photoUrl' => app_url('/api/photos.php?id=' . urlencode($row['photo_id'])),
                'createdAt' => (int) $row['created_at'],
                'updatedAt' => (int) $row['updated_at'],
                'version' => (int) $row['version']
            ]
        ];
    }

    echo json_encode(
        [
            'type' => 'FeatureCollection',
            'features' => $features
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        'error' => 'No se pudieron cargar los incidentes.'
    ]);
}