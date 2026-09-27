# Morón · Mapa territorial e incidentes

Versión final del proyecto con **frontend HTML/CSS/JavaScript + backend PHP + MySQL**.

El navegador no se conecta directamente a MySQL. El flujo es:

```text
Frontend (HTML / CSS / JS)
          ↓ fetch
API PHP
          ↓ PDO
MySQL
```

## Funciones incluidas

- Mapa público limitado al partido de Morón.
- Búsqueda de calle y altura mediante Georef.
- Filtros por categoría.
- Geolocalización y avisos de cercanía en el navegador.
- Panel privado `/admin/`.
- Alta, edición, resolución y archivo de incidentes.
- Fotografías almacenadas en MySQL.
- Contraseña administrativa derivada con PBKDF2-SHA256.
- Sesiones de 8 horas con cookie HttpOnly y token CSRF.
- Límite de intentos de acceso y de búsquedas.
- Caché de búsquedas de direcciones durante 24 horas.
- Validación en servidor para impedir incidentes fuera de Morón.
- Control de versión del registro al editar.

## Estructura

```text
/
├── index.html
├── styles.css
├── .htaccess
├── admin/
│   └── index.html
├── api/
│   ├── incidents.php
│   ├── photos.php
│   ├── search.php
│   └── admin/
│       ├── incidents.php
│       ├── login.php
│       ├── logout.php
│       ├── session.php
│       └── setup.php
├── backend/
│   ├── .htaccess
│   ├── config.php
│   ├── database.php
│   ├── incident_helpers.php
│   └── security.php
├── data/
│   └── moron.geojson
├── js/
│   └── ...
└── sql/
    └── schema.sql
```

## Instalación local con XAMPP

### 1. Copiar el proyecto

Copiá **el contenido de esta carpeta** dentro de:

```text
C:\xampp\htdocs\
```

El `.htaccess` incluido prioriza `index.html`, incluso si XAMPP conserva su `index.php` original.

### 2. Iniciar servicios

Desde XAMPP iniciá:

- Apache
- MySQL

### 3. Crear la base

Abrí:

```text
http://localhost/phpmyadmin
```

Importá:

```text
sql/schema.sql
```

El script crea `moron_incidentes` y estas tablas:

- `admins`
- `sessions`
- `rate_limits`
- `search_cache`
- `photo_blobs`
- `incidents`

### 4. Conexión MySQL

`backend/database.php` usa por defecto la configuración típica de XAMPP:

```text
Host: 127.0.0.1
Puerto: 3306
Base: moron_incidentes
Usuario: root
Contraseña: vacía
```

También acepta variables de entorno:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

Para un servidor real, usá un usuario MySQL propio y una contraseña fuerte; no uses `root` sin contraseña.

### 5. Primera activación del administrador

Si la tabla `admins` está vacía, abrí:

```text
http://localhost/admin/#setup=abd7a7668be847a73bae4ada6fdc020e6f5d3b4e0ee2457ba2c51f65f2024ee8
```

Elegí una contraseña de 14 a 128 caracteres.

El token anterior es **solo para instalación local/entrega**. Antes de publicar el proyecto en Internet, reemplazalo en `backend/config.php` o definí la variable de entorno `ADMIN_SETUP_TOKEN` con un valor aleatorio de al menos 32 caracteres.

Si ya existe un administrador en la base, no se vuelve a ejecutar la activación: ingresá normalmente en `/admin/`.

## URLs principales

```text
http://localhost/
http://localhost/admin/
```

API pública:

```text
GET /api/incidents.php
GET /api/search.php?q=Leandro%20Alem%201678
GET /api/photos.php?id=UUID
```

API administrativa:

```text
GET  /api/admin/session.php
POST /api/admin/setup.php
POST /api/admin/login.php
POST /api/admin/logout.php
GET  /api/admin/incidents.php
POST /api/admin/incidents.php
POST /api/admin/incidents.php?id=UUID + X-HTTP-Method-Override: PATCH
POST /api/admin/incidents.php?id=UUID + X-HTTP-Method-Override: DELETE
```

La adaptación `POST + X-HTTP-Method-Override` se usa porque PHP procesa de forma directa los archivos `multipart/form-data` enviados por POST.

## Estados de un incidente

- `active`: aparece en el mapa público y puede generar avisos.
- `resolved`: permanece en administración pero deja de aparecer públicamente.
- `archived`: se retira de la lista habitual y del mapa; el registro se conserva en la base.

## Fotografías

El panel acepta JPG, PNG o WebP de hasta 15 MB como archivo original. El navegador prepara un JPEG con lado máximo de 1600 px y hasta 2 MB antes de enviarlo. El servidor vuelve a validar tamaño y formato y almacena los bytes en `photo_blobs`.

## Georef

`api/search.php` consulta el servicio de direcciones de Georef y limita los resultados al partido de Morón. Los resultados se cachean en `search_cache` durante 24 horas.

Para que funcione, PHP debe tener habilitada la extensión **cURL**.

## Seguridad y publicación

La configuración local está pensada para XAMPP. Para publicar el proyecto:

1. Usar HTTPS.
2. Crear un usuario MySQL exclusivo para la aplicación con contraseña fuerte.
3. Definir las credenciales mediante variables de entorno.
4. Cambiar `ADMIN_SETUP_TOKEN` y no compartir el enlace de activación.
5. Mantener `backend/` bloqueado para acceso HTTP directo.
6. Mantener copias de seguridad de MySQL, especialmente `incidents`, `photo_blobs` y `admins`.

Las coordenadas de geolocalización de los visitantes no se guardan en MySQL: el cálculo de proximidad se realiza en el navegador.

## Comprobaciones realizadas durante el desarrollo

Se comprobó manualmente en XAMPP el circuito:

- PHP → MySQL.
- Mapa público leyendo incidentes desde MySQL.
- Búsqueda de una dirección de Morón con Georef.
- Alta de incidente desde `/admin/`.
- Carga y visualización de fotografía.
- Edición de categoría/datos manteniendo la foto.
- Cambio a estado resuelto y desaparición del mapa público.
- Retiro/archivo del incidente.
- Creación de contraseña administrativa y sesiones.

El ZIP no incluye los datos de la base local: `sql/schema.sql` contiene únicamente la estructura para crear una instalación nueva.
