const router = require('express').Router();
const sanitizeHtml = require('sanitize-html');
const db = require('../config/db');
const { asyncHandler, HttpError } = require('../utils/http');
const { getLang, tcol } = require('../utils/i18n');

const SANITIZE = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'figure', 'figcaption']),
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'width', 'height', 'loading'] },
  allowedSchemes: ['https', 'mailto'],
};

/** GET /posts?page=1&limit=9&category=slug&lang=es */
router.get('/', asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 50);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  const category = typeof req.query.category === 'string' ? req.query.category.slice(0, 80) : '';

  const where = ["p.status = 'published'", 'p.published_at <= UTC_TIMESTAMP()'];
  const params = [];
  if (category) { where.push('c.slug = ?'); params.push(category); }
  const whereSql = where.join(' AND ');

  const [{ total }] = await db.query(
    `SELECT COUNT(*) AS total FROM posts p LEFT JOIN post_categories c ON c.id = p.category_id WHERE ${whereSql}`,
    params
  );
  const data = await db.query(
    `SELECT p.slug, ${tcol('p.title', lang)}, ${tcol('p.excerpt', lang)}, p.cover_image, p.published_at,
            ${tcol('c.name', lang, 'category_name')}, c.slug AS category_slug
       FROM posts p LEFT JOIN post_categories c ON c.id = p.category_id
      WHERE ${whereSql}
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.set('Cache-Control', 'public, max-age=120');
  res.set('Vary', 'Accept-Language');
  res.json({ data, lang, meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
}));

router.get('/categories', asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const data = await db.query(`SELECT slug, ${tcol('name', lang)} FROM post_categories ORDER BY sort_order, name`);
  res.set('Cache-Control', 'public, max-age=600');
  res.set('Vary', 'Accept-Language');
  res.json({ data, lang });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const lang = getLang(req);
  const post = await db.queryOne(
    `SELECT p.slug, ${tcol('p.title', lang)}, ${tcol('p.excerpt', lang)}, p.cover_image, ${tcol('p.content_html', lang)}, p.published_at,
            ${tcol('c.name', lang, 'category_name')}, c.slug AS category_slug, t.name AS author_name
       FROM posts p
       LEFT JOIN post_categories c ON c.id = p.category_id
       LEFT JOIN team_members t ON t.id = p.author_id
      WHERE p.slug = ? AND p.status = 'published' AND p.published_at <= UTC_TIMESTAMP()`,
    [req.params.slug]
  );
  if (!post) throw new HttpError(404, lang === 'es' ? 'Publicación no encontrada.' : 'Post not found.');
  post.content_html = sanitizeHtml(post.content_html || '', SANITIZE);
  res.set('Cache-Control', 'public, max-age=300');
  res.set('Vary', 'Accept-Language');
  res.json({ data: post, lang });
}));

module.exports = router;
