/**
 * Content admin (SAW) API — /api/admin/*
 * Requires an active SAW session. /me, /schema and /repository are open to
 * every SAW role (admin, editor, uploader); everything else needs a content
 * role (admin, editor), and each resource adds its own list (e.g. users and
 * email_log are admin-only).
 */
const router = require('express').Router();
const env = require('../config/env');
const db = require('../config/db');
const resources = require('../admin/resources');
const crud = require('../admin/crud');
const media = require('../admin/media');
const texts = require('../admin/texts');
const sessions = require('../services/session.service');
const ROLES = require('../config/roles');
const repository = require('./repository.routes');
const { requireAuth, requireRole, requireCsrfHeader } = require('../middleware/security');
const { asyncHandler, HttpError } = require('../utils/http');

router.use(requireAuth, requireRole(...ROLES.SAW), requireCsrfHeader);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const idParam = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'ID no válido.');
  return id;
};

function resourceFor(req) {
  const key = req.params.resource;
  const resource = Object.prototype.hasOwnProperty.call(resources, key) ? resources[key] : null;
  if (!resource) throw new HttpError(404, 'Apartado no encontrado.');
  if (!resource.roles.includes(req.user.role)) throw new HttpError(403, 'No tiene permiso para este apartado.');
  return resource;
}

/** Session user + where the public site lives (for previews) */
router.get('/me', (req, res) => {
  res.json({ data: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role }, siteUrl: env.siteUrl });
});

/** Resource definitions for SAW (only what the role can access) */
router.get('/schema', (req, res) => {
  const data = Object.entries(resources)
    .filter(([, r]) => r.roles.includes(req.user.role))
    .map(([key, r]) => ({
      key, label: r.label, singular: r.singular, group: r.group, icon: r.icon,
      readOnly: !!r.readOnly, noCreate: !!r.noCreate, exportCsv: !!r.exportCsv,
      filters: r.filters || [], searchable: !!(r.search && r.search.length),
      fields: r.fields.map(({ name, label, type, required, list, max, min, values, ref, from, createOnly, half }) =>
        ({ name, label, type, required, list, max, min, values, ref, from, createOnly, half })),
    }));
  res.json({
    data,
    uploadMaxMb: env.uploadMaxMb,
    mediaTypes: Object.keys(media.TYPES),
    // Which SAW areas this role can open
    features: {
      content: ROLES.CONTENT.includes(req.user.role),
      repository: ROLES.REPOSITORY.includes(req.user.role),
      repositorySettings: ROLES.REPOSITORY_SETTINGS.includes(req.user.role),
    },
  });
});

/* ---------- File repository (OneDrive) — also for the uploader role ---------- */
router.use('/repository', requireRole(...ROLES.REPOSITORY), repository.router);

/* ---------- From here on: website content roles only ---------- */
router.use(requireRole(...ROLES.CONTENT));

/** Dashboard summary */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const one = async (sql) => (await db.queryOne(sql)).n;
  const [contactsNew, contactsTotal, subscribers, postsPublished, postsDraft, mediaCount, team] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM contact_requests WHERE status = 'new'"),
    one('SELECT COUNT(*) AS n FROM contact_requests'),
    one("SELECT COUNT(*) AS n FROM newsletter_subscribers WHERE status = 'subscribed'"),
    one("SELECT COUNT(*) AS n FROM posts WHERE status = 'published'"),
    one("SELECT COUNT(*) AS n FROM posts WHERE status = 'draft'"),
    one('SELECT COUNT(*) AS n FROM media'),
    one('SELECT COUNT(*) AS n FROM team_members WHERE is_active = 1'),
  ]);
  const recentContacts = await db.query(
    'SELECT id, created_at, name, company, service, status FROM contact_requests ORDER BY created_at DESC LIMIT 6'
  );
  const recentSubscribers = await db.query(
    "SELECT id, created_at, email, lang FROM newsletter_subscribers WHERE status = 'subscribed' ORDER BY created_at DESC LIMIT 6"
  );
  res.json({ data: { contactsNew, contactsTotal, subscribers, postsPublished, postsDraft, mediaCount, team, recentContacts, recentSubscribers } });
}));

/* ---------- Website texts (i18n JSON) ---------- */
router.get('/texts', asyncHandler(async (req, res) => res.json({ data: await texts.list() })));
router.put('/texts', asyncHandler(async (req, res) => res.json(await texts.save(req.body && req.body.changes))));

/* ---------- Media library ---------- */
router.get('/media', asyncHandler(async (req, res) => res.json(await media.list(req.query))));
router.post('/media', media.receive, asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw new HttpError(422, 'Seleccione al menos un archivo.');
  const result = await media.register(req.files, req.user.id);
  res.status(result.saved.length ? 201 : 422).json(result);
}));
router.put('/media/:id', asyncHandler(async (req, res) => res.json({ data: await media.updateAlt(idParam(req), req.body || {}) })));
router.delete('/media/:id', asyncHandler(async (req, res) => {
  await media.remove(idParam(req), req.query.force === '1');
  res.json({ ok: true });
}));

/* ---------- Options for "ref" fields (id + label) ---------- */
router.get('/options/:resource', asyncHandler(async (req, res) => {
  const resource = resourceFor(req);
  const labelField = resource.fields.find((f) => f.list && ['text', 'email'].includes(f.type)) || resource.fields[0];
  const rows = await db.query(
    `SELECT id AS value, \`${labelField.name}\` AS label FROM \`${resource.table}\` ORDER BY \`${labelField.name}\` LIMIT 1000`
  );
  res.json({ data: rows });
}));

/* ---------- Generic CRUD ---------- */
router.get('/r/:resource', asyncHandler(async (req, res) => res.json(await crud.list(resourceFor(req), req.query))));

router.get('/r/:resource/export.csv', asyncHandler(async (req, res) => {
  const resource = resourceFor(req);
  if (!resource.exportCsv) throw new HttpError(404, 'Exportación no disponible.');
  const csv = await crud.exportCsv(resource, req.query);
  const name = `${req.params.resource}-${new Date().toISOString().slice(0, 10)}.csv`;
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${name}"`);
  res.send(csv);
}));

router.get('/r/:resource/:id', asyncHandler(async (req, res) => res.json({ data: await crud.get(resourceFor(req), idParam(req)) })));

router.post('/r/:resource', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await crud.create(resourceFor(req), req.body || {}) });
}));

router.put('/r/:resource/:id', asyncHandler(async (req, res) => {
  const resource = resourceFor(req);
  const id = idParam(req);
  const body = req.body || {};
  if (req.params.resource === 'users' && id === req.user.id) {
    // An admin can't lock themselves out
    if (body.role && body.role !== req.user.role) throw new HttpError(422, 'No puede cambiar su propio rol.');
    if (body.status && body.status !== 'active') throw new HttpError(422, 'No puede desactivar su propia cuenta.');
  }
  const { row, changed } = await crud.update(resource, id, body);
  if (req.params.resource === 'users' && (changed.includes('password_hash') || changed.includes('status') || changed.includes('role')) && id !== req.user.id) {
    await sessions.destroyAllForUser(id); // new password / disabled / new role → sign in again
  }
  res.json({ data: row });
}));

router.delete('/r/:resource/:id', asyncHandler(async (req, res) => {
  const id = idParam(req);
  if (req.params.resource === 'users' && id === req.user.id) throw new HttpError(422, 'No puede eliminar su propia cuenta.');
  await crud.remove(resourceFor(req), id);
  res.json({ ok: true });
}));

module.exports = router;
