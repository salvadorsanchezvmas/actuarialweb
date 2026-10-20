const router = require('express').Router();
const db = require('../config/db');
const { asyncHandler, HttpError } = require('../utils/http');
const { getLang, tcol } = require('../utils/i18n');

/** Public, cacheable content used across the site (localized with ?lang=en|es) */
const cache = (seconds) => (req, res, next) => {
  res.set('Cache-Control', `public, max-age=${seconds}`);
  res.set('Vary', 'Accept-Language');
  next();
};

router.get('/stats', cache(600), asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const data = await db.query(
    `SELECT ${tcol('label', lang)}, value, suffix FROM stats WHERE is_active = 1 ORDER BY sort_order`
  );
  res.json({ data, lang });
}));

router.get('/testimonials', cache(600), asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const data = await db.query(
    `SELECT id, ${tcol('author_role', lang)}, company_type, rating, ${tcol('quote', lang)}
       FROM testimonials WHERE is_active = 1 ORDER BY sort_order LIMIT 12`
  );
  res.json({ data, lang });
}));

router.get('/services', cache(600), asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const data = await db.query(
    `SELECT slug, ${tcol('title', lang)}, ${tcol('tag', lang)}, ${tcol('summary', lang)}, icon
       FROM services WHERE is_active = 1 ORDER BY sort_order`
  );
  res.json({ data, lang });
}));

router.get('/services/:slug', cache(600), asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const service = await db.queryOne(
    `SELECT slug, ${tcol('title', lang)}, ${tcol('tag', lang)}, ${tcol('summary', lang)}, ${tcol('description_html', lang)}, icon
       FROM services WHERE slug = ? AND is_active = 1`,
    [req.params.slug]
  );
  if (!service) throw new HttpError(404, lang === 'es' ? 'Servicio no encontrado.' : 'Service not found.');
  res.json({ data: service, lang });
}));

router.get('/team', cache(600), asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const data = await db.query(
    `SELECT id, name, ${tcol('role', lang)}, ${tcol('bio', lang)}, photo_url, linkedin_url
       FROM team_members WHERE is_active = 1 ORDER BY sort_order`
  );
  res.json({ data, lang });
}));

router.get('/offices', cache(3600), asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const data = await db.query(
    `SELECT id, ${tcol('country', lang)}, ${tcol('city', lang)}, address_line, postal_code, phone, email, map_url
       FROM offices WHERE is_active = 1 ORDER BY sort_order`
  );
  res.json({ data, lang });
}));

router.get('/careers', cache(600), asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const data = await db.query(
    `SELECT id, ${tcol('title', lang)}, ${tcol('location', lang)}, ${tcol('employment_type', lang)}, ${tcol('summary', lang)}, created_at
       FROM careers WHERE status = 'open' ORDER BY created_at DESC`
  );
  res.json({ data, lang });
}));

module.exports = router;
