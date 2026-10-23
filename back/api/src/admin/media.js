/**
 * Media library: uploads go to front/uploads/YYYY/MM/<random>.<ext> and are
 * registered in the `media` table. The file type is checked twice: the
 * declared MIME type and the file's first bytes (magic numbers). SVG and any
 * script-capable type are rejected on purpose.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const db = require('../config/db');
const { HttpError } = require('../utils/http');

const TYPES = {
  'image/jpeg': { ext: '.jpg', sig: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: '.png', sig: (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: '.webp', sig: (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' },
  'image/gif': { ext: '.gif', sig: (b) => b.slice(0, 4).toString() === 'GIF8' },
  'application/pdf': { ext: '.pdf', sig: (b) => b.slice(0, 5).toString() === '%PDF-' },
  'video/mp4': { ext: '.mp4', sig: (b) => b.slice(4, 8).toString() === 'ftyp' },
};

function monthDir() {
  const d = new Date();
  return path.join(String(d.getUTCFullYear()), String(d.getUTCMonth() + 1).padStart(2, '0'));
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(env.paths.uploads, monthDir());
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(req, file, cb) {
    cb(null, crypto.randomBytes(12).toString('hex') + TYPES[file.mimetype].ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.uploadMaxMb * 1024 * 1024, files: 10 },
  fileFilter(req, file, cb) {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8'); // keep accents
    if (!TYPES[file.mimetype]) return cb(new HttpError(415, `Tipo de archivo no permitido: ${file.originalname}. Use JPG, PNG, WebP, GIF, PDF o MP4.`));
    cb(null, true);
  },
}).array('files', 10);

/** Express middleware wrapping multer with friendly errors. */
function receive(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, `Archivo demasiado grande (máximo ${env.uploadMaxMb} MB).`));
    if (err.code === 'LIMIT_FILE_COUNT') return next(new HttpError(413, 'Máximo 10 archivos por carga.'));
    next(err);
  });
}

async function readHead(file) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const buf = Buffer.alloc(16);
    await fh.read(buf, 0, 16, 0);
    return buf;
  } finally { await fh.close(); }
}

const toPublicPath = (abs) => 'uploads/' + path.relative(env.paths.uploads, abs).split(path.sep).join('/');
const toAbsPath = (publicPath) => {
  const abs = path.resolve(env.paths.uploads, publicPath.replace(/^uploads\//, ''));
  if (!abs.startsWith(env.paths.uploads + path.sep)) throw new HttpError(400, 'Ruta no válida.');
  return abs;
};

/** Registers uploaded files after verifying their real type. */
async function register(files, userId) {
  const saved = [];
  const rejected = [];
  for (const f of files) {
    const head = await readHead(f.path);
    if (!TYPES[f.mimetype].sig(head)) {
      await fs.promises.unlink(f.path).catch(() => {});
      rejected.push({ name: f.originalname, message: 'El contenido no coincide con el tipo de archivo.' });
      continue;
    }
    const publicPath = toPublicPath(f.path);
    const result = await db.query(
      'INSERT INTO media (path, original_name, mime_type, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [publicPath, f.originalname.slice(0, 255), f.mimetype, f.size, userId]
    );
    saved.push({ id: result.insertId, path: publicPath, original_name: f.originalname, mime_type: f.mimetype, size_bytes: f.size });
  }
  return { saved, rejected };
}

async function list(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 40, 1), 100);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const where = [];
  const params = [];
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  if (q) { where.push('(original_name LIKE ? OR alt_en LIKE ? OR alt_es LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (query.type === 'image') where.push("mime_type LIKE 'image/%'");
  if (query.type === 'document') where.push("mime_type = 'application/pdf'");
  if (query.type === 'video') where.push("mime_type LIKE 'video/%'");
  const sql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [{ total }] = await db.query(`SELECT COUNT(*) AS total FROM media ${sql}`, params);
  const data = await db.query(
    `SELECT id, path, original_name, mime_type, size_bytes, alt_en, alt_es, created_at FROM media ${sql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  return { data, meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } };
}

async function updateAlt(id, body) {
  const alt = (v) => (typeof v === 'string' ? v.trim().slice(0, 255) : null);
  const result = await db.query('UPDATE media SET alt_en = ?, alt_es = ? WHERE id = ?', [alt(body.alt_en), alt(body.alt_es), id]);
  if (!result.affectedRows) throw new HttpError(404, 'Archivo no encontrado.');
  return db.queryOne('SELECT id, path, original_name, mime_type, size_bytes, alt_en, alt_es, created_at FROM media WHERE id = ?', [id]);
}

/** Where a file is used, so it is not deleted by accident. */
async function usage(publicPath) {
  const like = `%${publicPath}%`;
  const rows = await db.query(
    `SELECT 'posts' AS resource, id, title AS label FROM posts WHERE cover_image = ? OR content_html LIKE ? OR content_html_es LIKE ?
     UNION ALL SELECT 'team_members', id, name FROM team_members WHERE photo_url = ?
     UNION ALL SELECT 'services', id, title FROM services WHERE description_html LIKE ? OR description_html_es LIKE ?`,
    [publicPath, like, like, publicPath, like, like]
  );
  return rows;
}

async function remove(id, force) {
  const item = await db.queryOne('SELECT id, path FROM media WHERE id = ?', [id]);
  if (!item) throw new HttpError(404, 'Archivo no encontrado.');
  const used = await usage(item.path);
  if (used.length && !force) {
    throw new HttpError(409, 'El archivo está en uso. Confirme para eliminarlo de todos modos.', used);
  }
  await db.query('DELETE FROM media WHERE id = ?', [id]);
  await fs.promises.unlink(toAbsPath(item.path)).catch(() => {});
}

module.exports = { receive, register, list, updateAlt, remove, TYPES };
