# Morón · Mapa territorial e incidentes

Aplicación web desarrollada con **HTML, CSS, JavaScript, PHP y MySQL** para visualizar y administrar incidentes dentro del partido de Morón.

## Importante para probar el proyecto en XAMPP

El repositorio está preparado para funcionar aunque se descargue dentro de una **subcarpeta de `htdocs`**. No depende de rutas absolutas como `/api/...` ni de estar copiado directamente en la raíz de XAMPP.

Ejemplo de instalación:

```text
C:\xampp\htdocs\moron-mapa-incidentes\
```

La entrada principal del proyecto es:

```text
index.php
```

No se utiliza `.htaccess` para iniciar la aplicación.

### URLs de ejemplo

Si la carpeta se llama `moron-mapa-incidentes`:

```text
http://localhost/moron-mapa-incidentes/
http://localhost/moron-mapa-incidentes/admin/
```

Si se cambia el nombre de la carpeta, las rutas internas se adaptan automáticamente.

## Instalación

1. Descargar o clonar el repositorio dentro de `C:\xampp\htdocs\`.
2. Iniciar **Apache** y **MySQL** desde XAMPP.
3. Abrir `http://localhost/phpmyadmin`.
4. Importar `sql/schema.sql`.
5. Abrir la URL correspondiente a la carpeta del proyecto.

`sql/schema.sql` crea la base `moron_incidentes` y las tablas:

- `admins`
- `sessions`
- `rate_limits`
- `search_cache`
- `photo_blobs`
- `incidents`

## Configuración MySQL

Por defecto `backend/database.php` utiliza la configuración típica de XAMPP:

```text
Host: 127.0.0.1
Puerto: 3306
Base: moron_incidentes
Usuario: root
Contraseña: vacía
```

También admite las variables de entorno `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.

## Primera activación del administrador

Con la tabla `admins` vacía, se utiliza el token definido en `backend/config.php`.

Si la carpeta se llama `moron-mapa-incidentes`, el formato de la URL es:

```text
http://localhost/moron-mapa-incidentes/admin/#setup=TOKEN
```

La contraseña administrativa debe tener entre 14 y 128 caracteres.

## Funcionalidades

- Mapa público limitado al partido de Morón.
- Búsqueda de calle y altura mediante Georef.
- Filtros por categoría.
- Geolocalización y avisos de cercanía.
- Panel privado de administración.
- Alta, edición, resolución y archivo de incidentes.
- Fotografías almacenadas en MySQL.
- Sesiones administrativas con cookie HttpOnly y token CSRF.
- Caché de búsquedas de direcciones.
- Validación del territorio de Morón en servidor.
- Control de versión durante la edición.

## Estructura principal

```text
/
├── index.php
├── styles.css
├── admin/
│   └── index.php
├── api/
│   ├── incidents.php
│   ├── photos.php
│   ├── search.php
│   └── admin/
├── backend/
│   ├── config.php
│   ├── database.php
│   ├── paths.php
│   ├── incident_helpers.php
│   └── security.php
├── data/
├── js/
└── sql/
    └── schema.sql
```

## Rutas de la API

Las URLs se construyen en función de la carpeta donde esté instalado el proyecto.

API pública:

```text
api/incidents.php
api/search.php?q=Leandro%20Alem%201678
api/photos.php?id=UUID
```

API administrativa:

```text
api/admin/session.php
api/admin/setup.php
api/admin/login.php
api/admin/logout.php
api/admin/incidents.php
```

## Estados

- `active`: aparece en el mapa público.
- `resolved`: permanece en administración y deja de aparecer públicamente.
- `archived`: se retira de la lista habitual y del mapa, pero se conserva en MySQL.

## Tecnologías

- HTML5
- CSS3
- JavaScript ES Modules
- PHP 8
- MySQL / MariaDB
- PDO
- Leaflet / MapLibre
- Georef
