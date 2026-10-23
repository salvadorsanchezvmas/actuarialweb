/**
 * Admin (SAW) resource catalog.
 * One entry per table: the API only reads/writes the columns listed here
 * (whitelist), validates them by type, and SAW builds its tables and forms
 * from the same definitions (GET /api/admin/schema).
 *
 * Field types: text, textarea, html, slug, email, url, int, decimal, bool,
 *              enum, date, datetime, media, ref, password, readonly
 * Field flags: required, list (show in table), max, min, values (enum),
 *              ref {resource, label}, from (slug source), createOnly, half
 */
const ALL = ['admin', 'editor'];
const ADMIN = ['admin'];

const sort = { name: 'sort_order', label: 'Orden', type: 'int', half: true };
const active = { name: 'is_active', label: 'Activo', type: 'bool', list: true, half: true };

module.exports = {
  posts: {
    group: 'Contenido', label: 'Blog / Publicaciones', singular: 'publicación', icon: 'file',
    table: 'posts', roles: ALL, orderBy: 'published_at DESC, id DESC', search: ['title', 'title_es', 'slug'],
    filters: ['status', 'category_id'],
    // Publishing without a date publishes now
    beforeSave(values, { isCreate }) {
      if (values.status === 'published' && !values.published_at && (isCreate || 'published_at' in values)) {
        values.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
    },
    fields: [
      { name: 'title', label: 'Título (EN)', type: 'text', required: true, max: 255, list: true },
      { name: 'title_es', label: 'Título (ES)', type: 'text', max: 255 },
      { name: 'slug', label: 'Slug (URL)', type: 'slug', required: true, max: 160, from: 'title', list: true },
      { name: 'category_id', label: 'Categoría', type: 'ref', ref: { resource: 'post_categories', label: 'name' }, list: true, half: true },
      { name: 'author_id', label: 'Autor', type: 'ref', ref: { resource: 'team_members', label: 'name' }, half: true },
      { name: 'status', label: 'Estado', type: 'enum', values: ['draft', 'published'], required: true, list: true, half: true },
      { name: 'published_at', label: 'Fecha de publicación', type: 'datetime', list: true, half: true },
      { name: 'cover_image', label: 'Imagen de portada', type: 'media' },
      { name: 'excerpt', label: 'Resumen (EN)', type: 'textarea', max: 500 },
      { name: 'excerpt_es', label: 'Resumen (ES)', type: 'textarea', max: 500 },
      { name: 'content_html', label: 'Contenido (EN)', type: 'html' },
      { name: 'content_html_es', label: 'Contenido (ES)', type: 'html' },
    ],
  },
  post_categories: {
    group: 'Contenido', label: 'Categorías del blog', singular: 'categoría', icon: 'tag',
    table: 'post_categories', roles: ALL, orderBy: 'sort_order, name', search: ['name', 'name_es', 'slug'],
    fields: [
      { name: 'name', label: 'Nombre (EN)', type: 'text', required: true, max: 120, list: true },
      { name: 'name_es', label: 'Nombre (ES)', type: 'text', max: 120, list: true },
      { name: 'slug', label: 'Slug', type: 'slug', required: true, max: 80, from: 'name', list: true },
      sort,
    ],
  },
  services: {
    group: 'Sitio web', label: 'Servicios', singular: 'servicio', icon: 'briefcase',
    table: 'services', roles: ALL, orderBy: 'sort_order, id', search: ['title', 'title_es', 'slug'],
    fields: [
      { name: 'title', label: 'Título (EN)', type: 'text', required: true, max: 160, list: true },
      { name: 'title_es', label: 'Título (ES)', type: 'text', max: 160, list: true },
      { name: 'slug', label: 'Slug', type: 'slug', required: true, max: 80, from: 'title' },
      { name: 'tag', label: 'Etiqueta (EN)', type: 'text', max: 80, half: true },
      { name: 'tag_es', label: 'Etiqueta (ES)', type: 'text', max: 80, half: true },
      { name: 'summary', label: 'Resumen (EN)', type: 'textarea', max: 500 },
      { name: 'summary_es', label: 'Resumen (ES)', type: 'textarea', max: 500 },
      { name: 'description_html', label: 'Descripción (EN)', type: 'html' },
      { name: 'description_html_es', label: 'Descripción (ES)', type: 'html' },
      { name: 'icon', label: 'Ícono', type: 'enum', values: ['pricing', 'reserve', 'shield', 'merge'], half: true },
      sort, active,
    ],
  },
  team_members: {
    group: 'Sitio web', label: 'Equipo de trabajo', singular: 'integrante', icon: 'users',
    table: 'team_members', roles: ALL, orderBy: 'sort_order, name', search: ['name', 'role', 'role_es'],
    fields: [
      { name: 'photo_url', label: 'Foto', type: 'media', list: true },
      { name: 'name', label: 'Nombre', type: 'text', required: true, max: 120, list: true },
      { name: 'role', label: 'Puesto (EN)', type: 'text', required: true, max: 120, list: true, half: true },
      { name: 'role_es', label: 'Puesto (ES)', type: 'text', max: 120, half: true },
      { name: 'bio', label: 'Biografía (EN)', type: 'textarea', max: 3000 },
      { name: 'bio_es', label: 'Biografía (ES)', type: 'textarea', max: 3000 },
      { name: 'linkedin_url', label: 'LinkedIn', type: 'url', max: 255 },
      sort, active,
    ],
  },
  testimonials: {
    group: 'Sitio web', label: 'Reseñas', singular: 'reseña', icon: 'star',
    table: 'testimonials', roles: ALL, orderBy: 'sort_order, id', search: ['author_role', 'quote'],
    fields: [
      { name: 'author_role', label: 'Autor / puesto (EN)', type: 'text', required: true, max: 120, list: true, half: true },
      { name: 'author_role_es', label: 'Autor / puesto (ES)', type: 'text', max: 120, half: true },
      { name: 'company_type', label: 'Tipo de empresa', type: 'text', max: 120, half: true },
      { name: 'rating', label: 'Calificación (0–5)', type: 'decimal', min: 0, max: 5, required: true, list: true, half: true },
      { name: 'quote', label: 'Reseña (EN)', type: 'textarea', required: true, max: 2000, list: true },
      { name: 'quote_es', label: 'Reseña (ES)', type: 'textarea', max: 2000 },
      sort, active,
    ],
  },
  stats: {
    group: 'Sitio web', label: 'Cifras (Home)', singular: 'cifra', icon: 'chart',
    table: 'stats', roles: ALL, orderBy: 'sort_order, id', search: ['label', 'label_es'],
    fields: [
      { name: 'value', label: 'Valor', type: 'int', required: true, list: true, half: true },
      { name: 'suffix', label: 'Sufijo (+, %)', type: 'text', max: 8, list: true, half: true },
      { name: 'label', label: 'Texto (EN)', type: 'text', required: true, max: 120, list: true, half: true },
      { name: 'label_es', label: 'Texto (ES)', type: 'text', max: 120, half: true },
      sort, active,
    ],
  },
  offices: {
    group: 'Sitio web', label: 'Oficinas', singular: 'oficina', icon: 'pin',
    table: 'offices', roles: ALL, orderBy: 'sort_order, id', search: ['city', 'country', 'address_line'],
    fields: [
      { name: 'country', label: 'País (EN)', type: 'text', required: true, max: 80, list: true, half: true },
      { name: 'country_es', label: 'País (ES)', type: 'text', max: 80, half: true },
      { name: 'city', label: 'Ciudad (EN)', type: 'text', required: true, max: 120, list: true, half: true },
      { name: 'city_es', label: 'Ciudad (ES)', type: 'text', max: 120, half: true },
      { name: 'address_line', label: 'Dirección', type: 'text', required: true, max: 255 },
      { name: 'postal_code', label: 'C.P.', type: 'text', max: 20, half: true },
      { name: 'phone', label: 'Teléfono', type: 'text', max: 30, list: true, half: true },
      { name: 'email', label: 'Correo', type: 'email', max: 160, half: true },
      { name: 'map_url', label: 'URL del mapa', type: 'url', max: 500 },
      sort, active,
    ],
  },
  careers: {
    group: 'Sitio web', label: 'Vacantes', singular: 'vacante', icon: 'badge',
    table: 'careers', roles: ALL, orderBy: 'created_at DESC', search: ['title', 'title_es', 'location'],
    filters: ['status'],
    fields: [
      { name: 'title', label: 'Puesto (EN)', type: 'text', required: true, max: 160, list: true, half: true },
      { name: 'title_es', label: 'Puesto (ES)', type: 'text', max: 160, half: true },
      { name: 'location', label: 'Ubicación (EN)', type: 'text', required: true, max: 120, list: true, half: true },
      { name: 'location_es', label: 'Ubicación (ES)', type: 'text', max: 120, half: true },
      { name: 'employment_type', label: 'Tipo (EN)', type: 'text', max: 60, half: true },
      { name: 'employment_type_es', label: 'Tipo (ES)', type: 'text', max: 60, half: true },
      { name: 'summary', label: 'Descripción (EN)', type: 'textarea', max: 3000 },
      { name: 'summary_es', label: 'Descripción (ES)', type: 'textarea', max: 3000 },
      { name: 'status', label: 'Estado', type: 'enum', values: ['open', 'closed'], required: true, list: true, half: true },
      { name: 'created_at', label: 'Creada', type: 'readonly', list: true },
    ],
  },
  contact_requests: {
    group: 'Formularios', label: 'Contactos', singular: 'contacto', icon: 'inbox',
    table: 'contact_requests', roles: ALL, orderBy: 'created_at DESC', search: ['name', 'company', 'email', 'message'],
    filters: ['status', 'service'], noCreate: true, exportCsv: true,
    fields: [
      { name: 'created_at', label: 'Fecha', type: 'readonly', list: true },
      { name: 'name', label: 'Nombre', type: 'readonly', list: true },
      { name: 'company', label: 'Empresa', type: 'readonly', list: true },
      { name: 'email', label: 'Correo', type: 'readonly', list: true },
      { name: 'phone', label: 'Teléfono', type: 'readonly' },
      { name: 'service', label: 'Servicio', type: 'readonly', list: true, values: ['pricing', 'reserving', 'captive', 'mergers', 'other'] },
      { name: 'preferred_date', label: 'Fecha preferida', type: 'readonly' },
      { name: 'subject', label: 'Asunto', type: 'readonly' },
      { name: 'message', label: 'Mensaje', type: 'readonly' },
      { name: 'lang', label: 'Idioma', type: 'readonly' },
      { name: 'source', label: 'Página', type: 'readonly' },
      { name: 'status', label: 'Seguimiento', type: 'enum', values: ['new', 'in_progress', 'closed'], required: true, list: true },
    ],
  },
  newsletter_subscribers: {
    group: 'Formularios', label: 'Suscriptores', singular: 'suscriptor', icon: 'mail',
    table: 'newsletter_subscribers', roles: ALL, orderBy: 'created_at DESC', search: ['email'],
    filters: ['status', 'lang'], exportCsv: true,
    defaults: () => ({ unsubscribe_token: require('crypto').randomBytes(24).toString('hex') }),
    fields: [
      { name: 'email', label: 'Correo', type: 'email', required: true, max: 160, list: true, createOnly: true },
      { name: 'status', label: 'Estado', type: 'enum', values: ['subscribed', 'unsubscribed'], required: true, list: true, half: true },
      { name: 'lang', label: 'Idioma', type: 'enum', values: ['en', 'es'], required: true, list: true, half: true },
      { name: 'source', label: 'Origen', type: 'readonly' },
      { name: 'created_at', label: 'Alta', type: 'readonly', list: true },
      { name: 'unsubscribed_at', label: 'Baja', type: 'readonly' },
    ],
  },
  users: {
    group: 'Sistema', label: 'Usuarios', singular: 'usuario', icon: 'key',
    table: 'users', roles: ADMIN, orderBy: 'name', search: ['name', 'email', 'company'],
    filters: ['role', 'status'],
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, max: 120, list: true },
      { name: 'email', label: 'Correo', type: 'email', required: true, max: 160, list: true },
      { name: 'company', label: 'Empresa', type: 'text', max: 160 },
      { name: 'role', label: 'Rol', type: 'enum', values: ['admin', 'editor', 'uploader', 'client'], required: true, list: true, half: true },
      { name: 'status', label: 'Estado', type: 'enum', values: ['active', 'disabled'], required: true, list: true, half: true },
      { name: 'password', label: 'Contraseña', type: 'password', min: 10, max: 200, column: 'password_hash' },
      { name: 'last_login_at', label: 'Último acceso', type: 'readonly', list: true },
    ],
  },
  email_log: {
    group: 'Sistema', label: 'Correos enviados', singular: 'correo', icon: 'send',
    table: 'email_log', roles: ADMIN, orderBy: 'created_at DESC', search: ['recipient', 'subject', 'template'],
    filters: ['status'], readOnly: true, exportCsv: true,
    fields: [
      { name: 'created_at', label: 'Fecha', type: 'readonly', list: true },
      { name: 'template', label: 'Plantilla', type: 'readonly', list: true },
      { name: 'recipient', label: 'Destinatario', type: 'readonly', list: true },
      { name: 'subject', label: 'Asunto', type: 'readonly', list: true },
      { name: 'status', label: 'Estado', type: 'readonly', list: true, values: ['sent', 'failed'] },
      { name: 'error', label: 'Error', type: 'readonly' },
    ],
  },
};
