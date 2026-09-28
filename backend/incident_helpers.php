<?php

declare(strict_types=1);

require_once __DIR__ . '/paths.php';

class IncidentApiException extends RuntimeException
{
    public int $status;

    public function __construct(string $message, int $status = 400)
    {
        parent::__construct($message);
        $this->status = $status;
    }
}


function incident_categories(): array
{
    return [
        'transito' => 'Tránsito',
        'alumbrado' => 'Alumbrado',
        'calles' => 'Calles y veredas',
        'residuos' => 'Residuos',
        'seguridad' => 'Seguridad',
        'otros' => 'Otros'
    ];
}


function incident_to_feature(array $row): array
{
    $categories = incident_categories();

    $categoryId = $row['category_id'];

    return [
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
            'title' => $row['title'],

            'categoryId' => $categoryId,

            'category' =>
                $categories[$categoryId]
                ?? 'Otros',

            'address' => $row['address'],

            'description' =>
                $row['description'],

            'status' =>
                $row['status'],

            'photoUrl' =>
                app_url('/api/photos.php?id=' . urlencode($row['photo_id'])),

            'createdAt' =>
                (int) $row['created_at'],

            'updatedAt' =>
                (int) $row['updated_at'],

            'version' =>
                (int) $row['version']
        ]
    ];
}


function valid_uuid(string $id): bool
{
    return preg_match(
        '/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i',
        $id
    ) === 1;
}


function create_uuid(): string
{
    $data = random_bytes(16);

    $data[6] =
        chr((ord($data[6]) & 0x0f) | 0x40);

    $data[8] =
        chr((ord($data[8]) & 0x3f) | 0x80);

    return vsprintf(
        '%s%s-%s-%s-%s-%s%s%s',
        str_split(bin2hex($data), 4)
    );
}


function text_field(
    array $data,
    string $field,
    int $min,
    int $max
): string {

    $value = $data[$field] ?? null;

    if (!is_string($value)) {
        throw new IncidentApiException(
            "El campo {$field} no es válido."
        );
    }

    $value = trim($value);

    $length = strlen($value);

    if ($length < $min || $length > $max) {
        throw new IncidentApiException(
            "Revisá el campo {$field}: debe tener entre {$min} y {$max} caracteres."
        );
    }

    return $value;
}


function point_on_segment(
    float $x,
    float $y,
    array $a,
    array $b
): bool {

    $cross =
        ($y - $a[1]) * ($b[0] - $a[0])
        -
        ($x - $a[0]) * ($b[1] - $a[1]);

    if (abs($cross) > 0.00000001) {
        return false;
    }

    $dot =
        ($x - $a[0]) * ($b[0] - $a[0])
        +
        ($y - $a[1]) * ($b[1] - $a[1]);

    if ($dot < 0) {
        return false;
    }

    $lengthSquared =
        ($b[0] - $a[0]) ** 2
        +
        ($b[1] - $a[1]) ** 2;

    return $dot <= $lengthSquared;
}


function point_in_ring(
    float $x,
    float $y,
    array $ring
): bool {

    $inside = false;

    $count = count($ring);

    for (
        $i = 0, $j = $count - 1;
        $i < $count;
        $j = $i++
    ) {

        $a = $ring[$j];
        $b = $ring[$i];

        if (point_on_segment($x, $y, $a, $b)) {
            return true;
        }

        $intersects =
            (($b[1] > $y) !== ($a[1] > $y))
            &&
            (
                $x <
                ($a[0] - $b[0])
                * ($y - $b[1])
                / ($a[1] - $b[1])
                + $b[0]
            );

        if ($intersects) {
            $inside = !$inside;
        }
    }

    return $inside;
}


function is_inside_moron(
    float $longitude,
    float $latitude
): bool {

    static $geometry = null;

    if ($geometry === null) {

        $path =
            __DIR__
            . '/../data/moron.geojson';

        if (!is_file($path)) {
            throw new IncidentApiException(
                'No se pudo validar el territorio de Morón.',
                500
            );
        }

        $json =
            json_decode(
                file_get_contents($path),
                true
            );

        $geometry =
            $json['features'][0]['geometry']
            ?? null;
    }

    if (!$geometry) {
        return false;
    }

    if ($geometry['type'] === 'Polygon') {

        $rings = $geometry['coordinates'];

        if (
            !point_in_ring(
                $longitude,
                $latitude,
                $rings[0]
            )
        ) {
            return false;
        }

        // Si existieran agujeros en el polígono.
        for ($i = 1; $i < count($rings); $i++) {
            if (
                point_in_ring(
                    $longitude,
                    $latitude,
                    $rings[$i]
                )
            ) {
                return false;
            }
        }

        return true;
    }

    return false;
}


function validate_incident(array $data): array
{
    $title =
        text_field($data, 'title', 3, 120);

    $address =
        text_field($data, 'address', 5, 220);

    $description =
        text_field(
            $data,
            'description',
            5,
            3000
        );

    $categoryId =
        $data['categoryId'] ?? '';

    $categories =
        incident_categories();

    if (
        !is_string($categoryId)
        ||
        !array_key_exists(
            $categoryId,
            $categories
        )
    ) {
        throw new IncidentApiException(
            'Elegí un tipo de incidente válido.'
        );
    }

    $status =
        $data['status']
        ?? 'active';

    if (
        !in_array(
            $status,
            ['active', 'resolved'],
            true
        )
    ) {
        throw new IncidentApiException(
            'Estado inválido.'
        );
    }

    $longitude =
        $data['longitude']
        ?? null;

    $latitude =
        $data['latitude']
        ?? null;

    if (
        !is_numeric($longitude)
        ||
        !is_numeric($latitude)
    ) {
        throw new IncidentApiException(
            'La ubicación no es válida.'
        );
    }

    $longitude = (float) $longitude;
    $latitude = (float) $latitude;

    if (
        !is_inside_moron(
            $longitude,
            $latitude
        )
    ) {
        throw new IncidentApiException(
            'El punto debe estar dentro del partido de Morón.'
        );
    }

    return [
        'title' => $title,
        'categoryId' => $categoryId,
        'address' => $address,
        'description' => $description,
        'longitude' => $longitude,
        'latitude' => $latitude,
        'status' => $status
    ];
}


function read_incident_form(): array
{
    $json =
        $_POST['data']
        ?? '';

    if (!is_string($json) || $json === '') {
        throw new IncidentApiException(
            'El formulario no es válido.'
        );
    }

    $data =
        json_decode(
            $json,
            true
        );

    if (!is_array($data)) {
        throw new IncidentApiException(
            'El formulario no es válido.'
        );
    }

    return $data;
}


function read_uploaded_photo(): ?array
{
    if (
        !isset($_FILES['photo'])
        ||
        $_FILES['photo']['error']
            === UPLOAD_ERR_NO_FILE
    ) {
        return null;
    }

    $file =
        $_FILES['photo'];

    if (
        $file['error']
        !== UPLOAD_ERR_OK
    ) {
        throw new IncidentApiException(
            'No se pudo recibir la fotografía.'
        );
    }

    if (
        $file['size'] <= 0
        ||
        $file['size'] > 2 * 1024 * 1024
    ) {
        throw new IncidentApiException(
            'La foto debe pesar hasta 2 MB después de prepararla.',
            413
        );
    }

    $bytes =
        file_get_contents(
            $file['tmp_name']
        );

    if ($bytes === false) {
        throw new IncidentApiException(
            'No se pudo leer la fotografía.'
        );
    }

    $mime = null;

    if (
        strlen($bytes) >= 3
        &&
        substr($bytes, 0, 3)
            === "\xFF\xD8\xFF"
    ) {
        $mime = 'image/jpeg';
    }

    elseif (
        strlen($bytes) >= 8
        &&
        substr($bytes, 0, 8)
            === "\x89PNG\r\n\x1A\n"
    ) {
        $mime = 'image/png';
    }

    elseif (
        strlen($bytes) >= 12
        &&
        substr($bytes, 0, 4) === 'RIFF'
        &&
        substr($bytes, 8, 4) === 'WEBP'
    ) {
        $mime = 'image/webp';
    }

    if ($mime === null) {
        throw new IncidentApiException(
            'Subí una foto JPG, PNG o WebP válida.',
            415
        );
    }

    return [
        'id' => create_uuid(),
        'mime' => $mime,
        'size' => strlen($bytes),
        'bytes' => $bytes
    ];
}