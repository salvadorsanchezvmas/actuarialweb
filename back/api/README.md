# Actuarial Factor — API

API REST en Node.js (Express) + MySQL + Nodemailer para el sitio `front/` y el administrador de contenido `front/SAW/`.

## Instalación

```bash
cd back/api
cp .env.example .env        # completar MySQL, SMTP, SITE_URL y ADMIN_URL
npm install
npm run db:schema           # crea tablas (incluye sessions y media del admin)
npm run db:seed             # contenido inicial (stats, oficinas, servicios, equipo)
npm run user:create -- "Nombre" correo@dominio.com "contraseña-segura" admin
npm start                   # http://127.0.0.1:4000/api  ·  admin: http://127.0.0.1:4000/SAW/
```

Desarrollo: `MAIL_DRY_RUN=true` registra los correos en consola en lugar de enviarlos.
En local, `SITE_URL=http://localhost:5500`, `ADMIN_URL=http://localhost:4000/SAW/` y `SESSION_SECURE_COOKIE=false`.

## Administrador de contenido (SAW)

Se entra desde el login del sitio (`/login`). Según el rol del usuario:

| Rol | Acceso |
|---|---|
| `admin` | Todo, incluidos **Usuarios** y **Correos enviados** |
| `editor` | Contenido, medios, textos, contactos y suscriptores (sin usuarios ni bitácora de correos) |
| `uploader` | Solo el **Repositorio de archivos** (OneDrive): subir, eliminar y editar metadatos |
| `client` | No entra al admin (reservado para un futuro portal de clientes) |

**Sesión sin PHP:** al iniciar sesión la API crea una sesión en MySQL (`sessions`) y envía una cookie
`af_session` `HttpOnly` + `SameSite=Strict` (+ `Secure` en producción) con un token aleatorio; en la base
solo se guarda su hash. Caduca a las 8 h o tras 2 h sin actividad (`SESSION_TTL_HOURS`, `SESSION_IDLE_MINUTES`).
Cerrar sesión, cambiar la contraseña o desactivar al usuario la invalida de inmediato.

**Protección de `/SAW`:** Node sirve la carpeta `front/SAW` solo si hay una sesión válida de admin/editor;
si no, redirige al login. En Apache, `front/.htaccess` envía `/SAW` a Node por proxy y bloquea el acceso
directo a la carpeta. Las escrituras exigen el encabezado `X-Requested-With: fetch` (protección CSRF).

Apartados del admin:

- **Inicio**: resumen (contactos nuevos, suscriptores, publicaciones, archivos, equipo).
- **Textos del sitio**: edita `front/i18n/en.json` y `es.json` (textos, botones, SEO y mensajes). Cada guardado
  deja un respaldo en `storage/backups/`.
- **Biblioteca de medios**: sube JPG, PNG, WebP, GIF, PDF y MP4 (máx. `UPLOAD_MAX_MB`) a `front/uploads/AAAA/MM/`.
  Se verifica el contenido real del archivo; SVG y scripts se rechazan. Avisa si un archivo está en uso antes de borrarlo.
- **Blog / Publicaciones** (EN/ES, editor de texto enriquecido, portada, borrador/publicada) y **Categorías**.
- **Servicios, Equipo de trabajo, Reseñas, Cifras (Home), Oficinas, Vacantes**: CRUD con campos EN/ES.
- **Contactos** (formulario de contacto): consulta, estado de seguimiento, exportar CSV.
- **Suscriptores** del newsletter: alta/baja, idioma, exportar CSV.
- **Usuarios** (solo admin) y **Correos enviados** (bitácora de `email_log`).

Los apartados se definen en `src/admin/resources.js`: la API solo lee/escribe las columnas listadas ahí y
el admin genera sus tablas y formularios a partir de la misma definición. Para agregar un campo nuevo:
columna en `database/schema.sql` + entrada en `resources.js`.

## Repositorio de archivos (rol `uploader`)

Usuarios con rol **`uploader`** solo ven **SAW › Repositorio de archivos**: suben imágenes y documentos
(JPG, PNG, WebP, GIF, PDF, DOCX, XLSX, PPTX, DOC, XLS, PPT, TXT, CSV; máx. `REPO_MAX_MB`), editan sus
metadatos (nombre, título, descripción, etiquetas, categoría, idioma) y los eliminan. Admin y editor
también lo ven; solo **admin** sincroniza y conecta OneDrive.

- El contenido va a **OneDrive** (`REPO_DRIVER=onedrive`) dentro de `ONEDRIVE_ROOT_FOLDER/<categoría>/`;
  la categoría funciona como subcarpeta y al cambiarla el archivo se mueve. Lo eliminado va a la papelera de OneDrive.
- MySQL (`repo_files`) guarda los metadatos para buscar y filtrar. **Sincronizar** importa archivos
  agregados directamente en OneDrive y marca los que ya no existen.
- Mientras no haya credenciales, `REPO_DRIVER=local` guarda los archivos en `storage/repository/`
  (fuera de la carpeta pública) con la misma interfaz.
- Cada archivo se valida por extensión **y** por su contenido real (firmas de archivo).

### Credenciales para conectar OneDrive

**A) OneDrive for Business / SharePoint (Microsoft 365) — `ONEDRIVE_AUTH=app` (recomendado)**

1. En Microsoft Entra ID (Azure AD) › *App registrations* › *New registration* (cuenta con permisos de administrador).
2. Anotar **Directory (tenant) ID** → `ONEDRIVE_TENANT_ID` y **Application (client) ID** → `ONEDRIVE_CLIENT_ID`.
3. *Certificates & secrets* › *New client secret* → `ONEDRIVE_CLIENT_SECRET` (anotar la fecha de vencimiento).
4. *API permissions* › Microsoft Graph › **Application permissions** › `Files.ReadWrite.All` › *Grant admin consent*.
   Para limitar el acceso a un solo sitio, usar `Sites.Selected` y otorgar permiso de escritura a ese sitio.
5. Destino (uno): `ONEDRIVE_USER` (UPN del dueño del OneDrive, p. ej. repositorio@actuarialfactor.com),
   `ONEDRIVE_SITE_ID` (biblioteca de un sitio de SharePoint) o `ONEDRIVE_DRIVE_ID`.

**B) OneDrive personal (outlook.com / hotmail) — `ONEDRIVE_AUTH=delegated`**

1. App registration con *Supported account types* que incluya **cuentas personales de Microsoft**.
2. `ONEDRIVE_CLIENT_ID`, `ONEDRIVE_CLIENT_SECRET` y Redirect URI (plataforma *Web*):
   `https://www.actuarialfactor.com/api/repository/onedrive/callback` → `ONEDRIVE_REDIRECT_URI`.
3. Permisos **delegados** `Files.ReadWrite`, `offline_access`, `User.Read`.
4. `ONEDRIVE_TOKEN_KEY`: llave de 64 caracteres hex para cifrar el refresh token (AES-256-GCM).
5. Un admin entra a SAW › Repositorio › **Conectar OneDrive** e inicia sesión una vez con la cuenta dueña.

Después: `REPO_DRIVER=onedrive`, reiniciar la API y revisar el estado en SAW (indicador verde = conectado).
En bases de datos existentes ejecutar `database/migrations/002_repository.sql`.

## Endpoints públicos

| Método | Ruta | Uso en el front |
|---|---|---|
| GET | `/api/health` | Monitoreo (estado de BD) |
| GET | `/api/stats` | Home — contadores |
| GET | `/api/testimonials` | Home — reseñas |
| GET | `/api/services`, `/api/services/:slug` | Practice areas |
| GET | `/api/team` | Our firm — equipo |
| GET | `/api/offices` | Oficinas |
| GET | `/api/careers` | Our firm — vacantes |
| GET | `/api/posts?page&limit&category` | Insights — listado |
| GET | `/api/posts/categories` | Insights — filtros |
| GET | `/api/posts/:slug` | Detalle de post |
| POST | `/api/contact` | Formulario de contacto → guarda + email al equipo + confirmación |
| POST | `/api/newsletter/subscribe` | Newsletter → guarda + email de bienvenida |
| GET | `/api/newsletter/unsubscribe?token=` | Baja desde el email |
| POST | `/api/auth/login` | Inicia sesión (cookie) y devuelve a dónde redirigir según el rol |
| POST | `/api/auth/logout` | Cierra la sesión |
| GET | `/api/auth/me` | Usuario de la sesión |
| POST | `/api/auth/forgot-password` | Envía enlace para restablecer contraseña |
| POST | `/api/auth/reset-password` | Cambia la contraseña con el token (cierra todas las sesiones) |

Todas aceptan `?lang=en|es` (o `Accept-Language`) y devuelven el contenido en ese idioma.

## Endpoints del admin (`/api/admin`, requieren sesión admin/editor)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/me`, `/schema`, `/dashboard` | Usuario, apartados permitidos, resumen |
| GET/PUT | `/texts` | Textos del sitio (i18n) |
| GET/POST/PUT/DELETE | `/media`, `/media/:id` | Biblioteca de medios (`?force=1` para borrar archivos en uso) |
| GET | `/options/:resource` | Opciones para listas desplegables |
| GET/POST | `/r/:resource` | Listar (`page`, `q`, `sort`, `dir`, `filter[campo]`) / crear |
| GET | `/r/:resource/export.csv` | Exportar CSV con los filtros activos |
| GET/PUT/DELETE | `/r/:resource/:id` | Ver / editar / eliminar |
| GET/POST | `/repository` | Repositorio: listar (`q`, `category`, `type`, `lang`) / subir (multipart `files` + metadatos) — también rol uploader |
| GET/PUT/DELETE | `/repository/:id` | Ver / editar metadatos / eliminar (también en OneDrive) |
| GET | `/repository/:id/download` | Descarga (redirige al enlace temporal de OneDrive) |
| GET | `/repository/status`, `/repository/categories` | Estado del almacenamiento y categorías |
| POST | `/repository/sync` | Sincronizar con OneDrive (solo admin) |
| POST/DELETE | `/repository/onedrive/connect`, `/repository/onedrive/connection` | Conectar / desconectar OneDrive personal (solo admin) |

## Despliegue en el servidor actual

El servidor es Linux con Apache/PHP-FPM (hosting WordPress, `.htaccess` habilitado). Node no viene por defecto en ese stack, así que hay dos opciones:

1. **Mismo servidor (recomendado si hay acceso SSH/cPanel "Setup Node.js App")**: correr la API con PM2
   (`pm2 start ecosystem.config.js --env production`) en `127.0.0.1:4000` y publicar `/api` y `/SAW` con el
   proxy de `front/.htaccess` (requiere `mod_proxy`). El front usa `/api` sin CORS.
2. **Subdominio / otro servidor**: publicar la API en `https://api.actuarialfactor.com`, agregar el dominio
   del sitio en `CORS_ORIGINS`, cambiar `API_BASE_URL` en `front/js/config.js` y `ADMIN_URL` al subdominio.
   En este caso la cookie de sesión debe compartir dominio con el sitio.

La API escucha solo en `127.0.0.1`; si se publica directamente sin proxy, cambiar el host en `src/server.js`.
Node necesita permiso de escritura en `front/uploads/` y `front/i18n/` (medios y textos del admin).
