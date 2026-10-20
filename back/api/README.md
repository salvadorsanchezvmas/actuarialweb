# Actuarial Factor — API

API REST en Node.js (Express) + MySQL + Nodemailer para el sitio `front/`.

## Instalación

```bash
cd back/api
cp .env.example .env        # completar credenciales MySQL, SMTP y JWT_SECRET
npm install
npm run db:schema           # crea tablas
npm run db:seed             # contenido inicial (stats, oficinas, servicios, equipo)
npm run user:create -- "Nombre" correo@dominio.com "password123" admin
npm start                   # http://127.0.0.1:4000/api
```

Desarrollo: `MAIL_DRY_RUN=true` registra los correos en consola en lugar de enviarlos.

## Endpoints

| Método | Ruta | Uso en el front |
|---|---|---|
| GET | `/api/health` | Monitoreo (estado de BD) |
| GET | `/api/stats` | Home — contadores |
| GET | `/api/testimonials` | Home — "What they say?" |
| GET | `/api/services`, `/api/services/:slug` | Practice areas |
| GET | `/api/team` | Our firm — equipo |
| GET | `/api/offices` | Oficinas |
| GET | `/api/careers` | Our firm — vacantes |
| GET | `/api/posts?page&limit&category` | Insights — listado |
| GET | `/api/posts/categories` | Insights — filtros |
| GET | `/api/posts/:slug` | Detalle de post |
| POST | `/api/contact` | Formulario "Schedule a consultation" → guarda + email al equipo + confirmación |
| POST | `/api/newsletter/subscribe` | Newsletter → guarda + email de bienvenida |
| GET | `/api/newsletter/unsubscribe?token=` | Baja desde el email |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Usuario actual (Bearer token) |
| POST | `/api/auth/forgot-password` | Envía link de reseteo |
| POST | `/api/auth/reset-password` | Cambia contraseña con el token |

Todos los envíos de correo quedan registrados en la tabla `email_log` (sent / failed).

## Despliegue en el servidor actual

El servidor es Linux con Apache/PHP-FPM (hosting WordPress, `.htaccess` habilitado). Node no viene por defecto en ese stack, así que hay dos opciones:

1. **Mismo servidor (recomendado si hay acceso SSH/cPanel "Setup Node.js App")**: correr la API con PM2
   (`pm2 start ecosystem.config.js --env production`) en `127.0.0.1:4000` y publicarla en `/api` con el
   proxy de `front/.htaccess` (requiere `mod_proxy`). El front usa `/api` sin CORS.
2. **Subdominio / otro servidor**: publicar la API en `https://api.actuarialfactor.com`, agregar el dominio
   del sitio en `CORS_ORIGINS` y cambiar `API_BASE_URL` en `front/js/config.js`.

La API escucha solo en `127.0.0.1`; si se publica directamente sin proxy, cambiar el host en `src/server.js`.
