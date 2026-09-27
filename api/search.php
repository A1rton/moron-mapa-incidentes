<?php

declare(strict_types=1);

require_once __DIR__ . '/../backend/security.php';
require_once __DIR__ . '/../backend/incident_helpers.php';


class SearchApiException extends RuntimeException
{
    public int $status;

    public function __construct(
        string $message,
        int $status = 400
    ) {
        parent::__construct($message);
        $this->status = $status;
    }
}


/*
 * Máximo 30 búsquedas por minuto.
 */
function limit_search(PDO $pdo): void
{
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $key = 'search:' . hash('sha256', $remote);

    $now = now_ms();

    $window = 60 * 1000;

    $maximum = 30;

    $pdo->beginTransaction();

    try {

        $stmt = $pdo->prepare("
            SELECT
                hits,
                expires_at
            FROM rate_limits
            WHERE id = ?
            FOR UPDATE
        ");

        $stmt->execute([$key]);

        $row = $stmt->fetch();


        if (!$row) {

            $stmt = $pdo->prepare("
                INSERT INTO rate_limits (
                    id,
                    hits,
                    expires_at
                )
                VALUES (?, 1, ?)
            ");

            $stmt->execute([
                $key,
                $now + $window
            ]);

        } elseif (
            (int) $row['expires_at']
            <= $now
        ) {

            $stmt = $pdo->prepare("
                UPDATE rate_limits
                SET
                    hits = 1,
                    expires_at = ?
                WHERE id = ?
            ");

            $stmt->execute([
                $now + $window,
                $key
            ]);

        } elseif (
            (int) $row['hits']
            >= $maximum
        ) {

            $pdo->rollBack();

            throw new SearchApiException(
                'Hiciste demasiadas búsquedas. Esperá un momento y volvé a intentar.',
                429
            );

        } else {

            $stmt = $pdo->prepare("
                UPDATE rate_limits
                SET hits = hits + 1
                WHERE id = ?
            ");

            $stmt->execute([$key]);
        }


        $pdo->commit();

    } catch (Throwable $error) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $error;
    }
}


/*
 * Consulta HTTPS a Georef.
 */
function georef_search(
    string $query
): array {

    if (!function_exists('curl_init')) {
        throw new SearchApiException(
            'PHP no tiene habilitada la extensión cURL.',
            500
        );
    }


    $params = http_build_query([
        'direccion' => $query,

        // Partido de Morón
        'departamento' => '06568',

        // Provincia de Buenos Aires
        'provincia' => '06',

        'max' => '8'
    ]);


    $url =
        'https://apis.datos.gob.ar/georef/api/direcciones?'
        . $params;


    $curl = curl_init($url);

    curl_setopt_array(
        $curl,
        [
            CURLOPT_RETURNTRANSFER => true,

            CURLOPT_FOLLOWLOCATION => false,

            CURLOPT_CONNECTTIMEOUT => 5,

            CURLOPT_TIMEOUT => 12,

            CURLOPT_HTTPHEADER => [
                'Accept: application/json'
            ],

            CURLOPT_USERAGENT =>
                'MoronMapa/2.0'
        ]
    );


    $response =
        curl_exec($curl);


    if ($response === false) {

        curl_close($curl);

        throw new SearchApiException(
            'El buscador de direcciones no respondió. Volvé a intentar.',
            503
        );
    }


    $status =
        curl_getinfo(
            $curl,
            CURLINFO_HTTP_CODE
        );


    curl_close($curl);


    if (
        $status < 200
        ||
        $status >= 300
    ) {
        throw new SearchApiException(
            'El buscador no está disponible en este momento.',
            503
        );
    }


    $data =
        json_decode(
            $response,
            true
        );


    if (!is_array($data)) {
        throw new SearchApiException(
            'Georef devolvió una respuesta inválida.',
            503
        );
    }


    return $data;
}


/*
 * Convierte la respuesta de Georef
 * al formato que espera nuestro frontend.
 */
function format_results(array $data): array
{
    $results = [];

    $direcciones =
        $data['direcciones']
        ?? [];


    if (!is_array($direcciones)) {
        return [];
    }


    foreach ($direcciones as $place) {

        $departmentId =
            (string) (
                $place['departamento']['id']
                ?? ''
            );


        /*
         * Seguridad adicional:
         * solamente Morón.
         */
        if ($departmentId !== '06568') {
            continue;
        }


        $longitude =
            $place['ubicacion']['lon']
            ?? null;

        $latitude =
            $place['ubicacion']['lat']
            ?? null;


        if (
            !is_numeric($longitude)
            ||
            !is_numeric($latitude)
        ) {
            continue;
        }


        $longitude =
            (float) $longitude;

        $latitude =
            (float) $latitude;


        /*
         * Además comprobamos el punto
         * contra moron.geojson.
         */
        if (
            !is_inside_moron(
                $longitude,
                $latitude
            )
        ) {
            continue;
        }


        $street =
            trim(
                (string) (
                    $place['calle']['nombre']
                    ?? ''
                )
            );


        $height =
            $place['altura']['valor']
            ?? null;


        $address =
            trim(
                $street
                . (
                    $height !== null
                    ? ' ' . $height
                    : ''
                )
            );


        $label =
            trim(
                (string) (
                    $place['nomenclatura']
                    ?? $address
                )
            );


        if ($address === '') {
            continue;
        }


        $results[] = [
            'label' => $label,

            'address' => $address,

            'center' => [
                $longitude,
                $latitude
            ]
        ];
    }


    return $results;
}


try {

    if (
        ($_SERVER['REQUEST_METHOD'] ?? '')
        !== 'GET'
    ) {
        json_response([
            'error' =>
                'Método no permitido.'
        ], 405);
    }


    $query =
        trim(
            (string) (
                $_GET['q']
                ?? ''
            )
        );


    if (
        strlen($query) < 3
        ||
        strlen($query) > 160
    ) {
        throw new SearchApiException(
            'Escribí una calle y altura de Morón.'
        );
    }


    $pdo = db();


    /*
     * Creamos una clave única para
     * guardar esta búsqueda.
     */
    $normalized =
        function_exists('mb_strtolower')
        ? mb_strtolower(
            $query,
            'UTF-8'
        )
        : strtolower($query);


    $cacheKey =
        hash(
            'sha256',
            $normalized
        );


    /*
     * Primero buscamos en caché.
     */
    $stmt = $pdo->prepare("
        SELECT result_json

        FROM search_cache

        WHERE id = ?
          AND expires_at > ?

        LIMIT 1
    ");

    $stmt->execute([
        $cacheKey,
        now_ms()
    ]);


    $cached =
        $stmt->fetch();


    if ($cached) {

        $body =
            json_decode(
                $cached['result_json'],
                true
            );


        if (is_array($body)) {
            json_response($body);
        }
    }


    /*
     * Si no estaba en caché,
     * controlamos cantidad de consultas.
     */
    limit_search($pdo);


    /*
     * Consultamos Georef.
     */
    $data =
        georef_search(
            $query
        );


    $results =
        format_results(
            $data
        );


    $body = [
        'results' => $results,

        'attribution' =>
            'Georef / Datos Argentina',

        'approximate' => true
    ];


    /*
     * Limpiamos caché vencida.
     */
    $stmt = $pdo->prepare("
        DELETE FROM search_cache
        WHERE expires_at <= ?
    ");

    $stmt->execute([
        now_ms()
    ]);


    /*
     * Guardamos esta búsqueda
     * durante 24 horas.
     */
    $expires =
        now_ms()
        + (24 * 60 * 60 * 1000);


    $stmt = $pdo->prepare("
        INSERT INTO search_cache (
            id,
            result_json,
            expires_at
        )

        VALUES (
            ?,
            ?,
            ?
        )

        ON DUPLICATE KEY UPDATE

            result_json =
                VALUES(result_json),

            expires_at =
                VALUES(expires_at)
    ");


    $stmt->execute([
        $cacheKey,

        json_encode(
            $body,
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
        ),

        $expires
    ]);


    json_response($body);


} catch (SearchApiException $error) {

    json_response([
        'error' =>
            $error->getMessage()
    ], $error->status);


} catch (Throwable $error) {

    json_response([
        'error' =>
            'No se pudo buscar la dirección.'
    ], 500);
}