-- MORÓN · Mapa territorial e incidentes
-- Esquema MySQL 8.x / MariaDB compatible para desarrollo local.
-- Crea la base y las seis tablas utilizadas por el backend PHP.

CREATE DATABASE IF NOT EXISTS moron_incidentes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE moron_incidentes;

CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64) PRIMARY KEY,
    csrf_token CHAR(64) NOT NULL,
    expires_at BIGINT NOT NULL,
    INDEX idx_sessions_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rate_limits (
    id VARCHAR(160) PRIMARY KEY,
    hits INT NOT NULL,
    expires_at BIGINT NOT NULL,
    INDEX idx_rate_limits_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS search_cache (
    id CHAR(64) PRIMARY KEY,
    result_json MEDIUMTEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    INDEX idx_search_cache_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS photo_blobs (
    id CHAR(36) PRIMARY KEY,
    mime VARCHAR(32) NOT NULL,
    bytes MEDIUMBLOB NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS incidents (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    category_id VARCHAR(32) NOT NULL,
    address VARCHAR(220) NOT NULL,
    description TEXT NOT NULL,
    longitude DOUBLE NOT NULL,
    latitude DOUBLE NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    photo_id CHAR(36) NOT NULL,
    photo_mime VARCHAR(32) NOT NULL,
    photo_size INT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    version INT NOT NULL DEFAULT 1,

    UNIQUE INDEX idx_incidents_photo (photo_id),
    INDEX idx_incidents_status_updated (status, updated_at),

    CHECK (longitude BETWEEN -180 AND 180),
    CHECK (latitude BETWEEN -90 AND 90),
    CHECK (status IN ('active', 'resolved', 'archived')),
    CHECK (category_id IN (
        'transito',
        'alumbrado',
        'calles',
        'residuos',
        'seguridad',
        'otros'
    ))
) ENGINE=InnoDB;
