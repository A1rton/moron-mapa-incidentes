<?php

declare(strict_types=1);

require_once __DIR__ . '/../../backend/security.php';
require_once __DIR__ . '/../../backend/incident_helpers.php';


$realMethod =
    strtoupper(
        $_SERVER['REQUEST_METHOD']
        ?? 'GET'
    );

$override =
    strtoupper(
        $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']
        ?? ''
    );

$method =
    ($realMethod === 'POST'
        && in_array(
            $override,
            ['PATCH', 'DELETE'],
            true
        ))
        ? $override
        : $realMethod;


try {

    /*
     * LISTAR INCIDENTES
     */
    if ($method === 'GET') {

        require_admin(false);

        $stmt = db()->prepare("
            SELECT *
            FROM incidents
            WHERE status <> 'archived'
            ORDER BY updated_at DESC
        ");

        $stmt->execute();

        $features = [];

        foreach ($stmt->fetchAll() as $row) {
            $features[] =
                incident_to_feature($row);
        }

        json_response([
            'type' => 'FeatureCollection',
            'features' => $features
        ]);
    }


    /*
     * Todas las operaciones siguientes
     * modifican información.
     */
    require_moron_request();

    require_admin(true);


    /*
     * ARCHIVAR
     */
    if ($method === 'DELETE') {

        $id =
            $_GET['id']
            ?? '';

        if (
            !is_string($id)
            ||
            !valid_uuid($id)
        ) {
            throw new IncidentApiException(
                'Incidente no encontrado.',
                404
            );
        }

        $stmt = db()->prepare("
            UPDATE incidents

            SET
                status = 'archived',
                updated_at = ?,
                version = version + 1

            WHERE id = ?
              AND status <> 'archived'
        ");

        $stmt->execute([
            now_ms(),
            $id
        ]);

        if ($stmt->rowCount() === 0) {
            throw new IncidentApiException(
                'Incidente no encontrado.',
                404
            );
        }

        json_response([
            'ok' => true
        ]);
    }


    /*
     * CREAR O EDITAR
     */
    if (
        $method !== 'POST'
        &&
        $method !== 'PATCH'
    ) {
        json_response([
            'error' =>
                'Método no permitido.'
        ], 405);
    }


    $data =
        read_incident_form();

    $record =
        validate_incident($data);

    $photo =
        read_uploaded_photo();

    $pdo = db();


    /*
     * CREAR INCIDENTE
     */
    if ($method === 'POST') {

        if ($photo === null) {
            throw new IncidentApiException(
                'Agregá una foto real de la calle o del lugar.'
            );
        }

        $requestedId =
            $data['id']
            ?? '';

        $incidentId =
            is_string($requestedId)
            && valid_uuid($requestedId)
                ? $requestedId
                : create_uuid();

        $check = $pdo->prepare("
            SELECT id
            FROM incidents
            WHERE id = ?
            LIMIT 1
        ");

        $check->execute([
            $incidentId
        ]);

        if ($check->fetch()) {
            throw new IncidentApiException(
                'Este incidente ya fue guardado. Actualizá la lista antes de editarlo.',
                409
            );
        }

        $now = now_ms();

        $pdo->beginTransaction();

        try {

            $stmt = $pdo->prepare("
                INSERT INTO photo_blobs (
                    id,
                    mime,
                    bytes
                )
                VALUES (?, ?, ?)
            ");

            $stmt->execute([
                $photo['id'],
                $photo['mime'],
                $photo['bytes']
            ]);


            $stmt = $pdo->prepare("
                INSERT INTO incidents (
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
                )

                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, 1
                )
            ");

            $stmt->execute([
                $incidentId,
                $record['title'],
                $record['categoryId'],
                $record['address'],
                $record['description'],
                $record['longitude'],
                $record['latitude'],
                $record['status'],
                $photo['id'],
                $photo['mime'],
                $photo['size'],
                $now,
                $now
            ]);


            $stmt = $pdo->prepare("
                SELECT *
                FROM incidents
                WHERE id = ?
                LIMIT 1
            ");

            $stmt->execute([
                $incidentId
            ]);

            $row =
                $stmt->fetch();


            $pdo->commit();

        } catch (Throwable $error) {

            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            throw $error;
        }


        json_response([
            'feature' =>
                incident_to_feature($row)
        ], 201);
    }


    /*
     * EDITAR INCIDENTE
     */
    $id =
        $_GET['id']
        ?? '';

    if (
        !is_string($id)
        ||
        !valid_uuid($id)
    ) {
        throw new IncidentApiException(
            'Ese incidente ya no está disponible.',
            404
        );
    }


    $stmt = $pdo->prepare("
        SELECT *
        FROM incidents
        WHERE id = ?
          AND status <> 'archived'
        LIMIT 1
    ");

    $stmt->execute([
        $id
    ]);

    $existing =
        $stmt->fetch();

    if (!$existing) {
        throw new IncidentApiException(
            'Ese incidente ya no está disponible.',
            404
        );
    }


    $version =
        $data['version']
        ?? null;

    if (
        !is_numeric($version)
        ||
        (int) $version
            !== (int) $existing['version']
    ) {
        throw new IncidentApiException(
            'El incidente cambió. Actualizá la lista antes de volver a guardar.',
            409
        );
    }


    $photoId =
        $photo
            ? $photo['id']
            : $existing['photo_id'];

    $photoMime =
        $photo
            ? $photo['mime']
            : $existing['photo_mime'];

    $photoSize =
        $photo
            ? $photo['size']
            : $existing['photo_size'];

    $now =
        now_ms();


    $pdo->beginTransaction();

    try {

        if ($photo !== null) {

            $stmt = $pdo->prepare("
                INSERT INTO photo_blobs (
                    id,
                    mime,
                    bytes
                )
                VALUES (?, ?, ?)
            ");

            $stmt->execute([
                $photo['id'],
                $photo['mime'],
                $photo['bytes']
            ]);
        }


        $stmt = $pdo->prepare("
            UPDATE incidents

            SET
                title = ?,
                category_id = ?,
                address = ?,
                description = ?,
                longitude = ?,
                latitude = ?,
                status = ?,
                photo_id = ?,
                photo_mime = ?,
                photo_size = ?,
                updated_at = ?,
                version = version + 1

            WHERE id = ?
              AND version = ?
              AND status <> 'archived'
        ");

        $stmt->execute([
            $record['title'],
            $record['categoryId'],
            $record['address'],
            $record['description'],
            $record['longitude'],
            $record['latitude'],
            $record['status'],
            $photoId,
            $photoMime,
            $photoSize,
            $now,
            $id,
            (int) $existing['version']
        ]);


        if ($stmt->rowCount() !== 1) {
            throw new IncidentApiException(
                'Otra edición modificó el incidente. Recargá la lista.',
                409
            );
        }


        /*
         * Si se reemplazó la foto,
         * borramos la fotografía anterior.
         */
        if ($photo !== null) {

            $stmt = $pdo->prepare("
                DELETE FROM photo_blobs
                WHERE id = ?
            ");

            $stmt->execute([
                $existing['photo_id']
            ]);
        }


        $stmt = $pdo->prepare("
            SELECT *
            FROM incidents
            WHERE id = ?
            LIMIT 1
        ");

        $stmt->execute([
            $id
        ]);

        $row =
            $stmt->fetch();


        $pdo->commit();

    } catch (Throwable $error) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $error;
    }


    json_response([
        'feature' =>
            incident_to_feature($row)
    ]);


} catch (IncidentApiException $error) {

    json_response([
        'error' =>
            $error->getMessage()
    ], $error->status);


} catch (Throwable $error) {

    json_response([
        'error' =>
            'No se pudo completar la operación. Tus cambios no se descartaron; volvé a intentar.'
    ], 500);
}