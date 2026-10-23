/**
 * File repository (images and documents) for the "uploader" role.
 * Content lives in OneDrive (or local storage until it is configured);
 * MySQL keeps the searchable metadata: title, description, tags, category
 * (= OneDrive subfolder) and language.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const db = require('../config/db');
const storage = require('../services/repository');
const { HttpError } = require('../utils/http');

/* ---------- Allowed types: decided by extension, verified by content ---------- */
const sig = {
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP',
  gif: (b) => b.slice(0, 4).toString() === 'GIF8',
  pdf: (b) => b.slice(0, 5).toString() === '%PDF-',
  zip: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04, // docx, xlsx, pptx
  ole: (b) => b.slice(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])), // doc, xls, ppt
  text: (b) => !b.includes(0x00),
};
const TYPES = {
  '.jpg': ['image/jpeg', sig.jpeg], '.jpeg': ['image/jpeg', sig.jpeg], '.png': ['image/png', sig.png],
  '.webp': ['image/webp', sig.webp], '.gif': ['image/gif', sig.gif], '.pdf': ['application/pdf', sig.pdf],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', sig.zip],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sig.zip],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', sig.zip],
  '.doc': ['application/msword', sig.ole], '.xls': ['application/vnd.ms-excel', sig.ole], '.ppt': ['application/vnd.ms-powerpoint', sig.ole],
  '.txt': ['text/plain', sig.text], '.csv': ['text/csv', sig.text],
};
const EXTENSIONS = Object.keys(TYPES);

const tmpDir = path.join(os.tmpdir(), 'af-repo-uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => fs.mkdir(tmpDir, { recursive: true }, (err) => cb(err, tmpDir)),
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: env.repository.maxMb * 1024 * 1024, files: 10, fields: 20 },
  fileFilter(req, file, cb) {
    // multer gives latin1 names; browsers send UTF-8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    if (!TYPES[path.extname(file.originalname).toLowerCase()]) {
      return cb(new HttpError(415, `Tipo no permitido: ${file.originalname}. Permitidos: ${EXTENSIONS.join(', ')}`));
    }
    cb(null, true);
  },
}).array('files', 10);

function receive(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, `Archivo demasiado grande (máximo ${env.repository.maxMb} MB).`));
    if (err.code === 'LIMIT_FILE_COUNT') return next(new HttpError(413, 'Máximo 10 archivos por carga.'));
    next(err);
  });
}

/* ---------- Metadata validation ---------- */
// OneDrive does not allow " * : < > ? / \ | in names
const cleanName = (s, max) => String(s || '').replace(/["*:<>?/\\|#%\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const folderFromCategory = (category) => cleanName(category, 80).replace(/^\.+/, '');

function metadata(body, { partial } = {}) {
  const out = {};
  const errors = [];
  const str = (name, max) => {
    if (!(name in body)) return;
    const v = typeof body[name] === 'string' ? body[name].trim() : '';
    if (v.length > max) errors.push({ field: name, message: `Máximo ${max} caracteres.` });
    out[name] = v || null;
  };
  str('title', 255);
  str('description', 5000);
  str('category', 120);
  if ('tags' in body) {
    const tags = String(body.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 30);
    out.tags = tags.length ? tags.join(', ').slice(0, 500) : null;
  }
  if ('lang' in body) {
    if (body.lang && !['en', 'es', 'other'].includes(body.lang)) errors.push({ field: 'lang', message: 'Idioma no válido.' });
    else out.lang = body.lang || null;
  }
  if ('file_name' in body) {
    const name = cleanName(body.file_name, 200);
    if (!name) errors.push({ field: 'file_name', message: 'Nombre de archivo obligatorio.' });
    out.file_name = name;
  }
  if (!partial && !out.title) delete out.title;
  if (errors.length) throw new HttpError(422, 'Revise los campos marcados.', errors);
  return out;
}

async function readHead(file) {
  const fh = await fs.promises.open(file, 'r');
  try { const b = Buffer.alloc(4096); const { bytesRead } = await fh.read(b, 0, 4096, 0); return b.slice(0, bytesRead); }
  finally { await fh.close(); }
}

const SELECT = `SELECT f.id, f.storage, f.folder, f.file_name, f.mime_type, f.size_bytes, f.title, f.description, f.tags,
  f.category, f.lang, f.web_url, f.is_missing, f.created_at, f.updated_at,
  u.name AS uploaded_by_name, e.name AS updated_by_name
  FROM repo_files f LEFT JOIN users u ON u.id = f.uploaded_by LEFT JOIN users e ON e.id = f.updated_by`;

async function getOne(id) {
  const row = await db.queryOne(`${SELECT} WHERE f.id = ?`, [id]);
  if (!row) throw new HttpError(404, 'Archivo no encontrado.');
  return row;
}

/* ---------- Operations ---------- */
async function create(files, body, user) {
  const meta = metadata(body);
  const folder = folderFromCategory(meta.category);
  const driver = storage.active();
  const saved = [];
  const rejected = [];
  for (const f of files) {
    try {
      const ext = path.extname(f.originalname).toLowerCase();
      const [mime, check] = TYPES[ext];
      if (!check(await readHead(f.path))) { rejected.push({ name: f.originalname, message: 'El contenido no coincide con el tipo de archivo.' }); continue; }
      const fileName = cleanName(f.originalname, 200) || `archivo${ext}`;
      const result = await driver.upload({ localPath: f.path, size: f.size, folder, fileName, mimeType: mime });
      const title = files.length === 1 && meta.title ? meta.title : path.basename(fileName, ext);
      const ins = await db.query(
        `INSERT INTO repo_files (storage, item_id, folder, file_name, mime_type, size_bytes, title, description, tags, category, lang, web_url, uploaded_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [driver.name, result.itemId, folder, result.fileName, mime, f.size, title, meta.description || null, meta.tags || null,
          meta.category || null, meta.lang || null, result.webUrl, user.id, user.id]
      );
      saved.push(await getOne(ins.insertId));
    } catch (err) {
      rejected.push({ name: f.originalname, message: err.message });
    } finally {
      fs.promises.unlink(f.path).catch(() => {});
    }
  }
  return { saved, rejected };
}

async function list(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 25, 1), 100);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const where = [];
  const params = [];
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  if (q) {
    where.push('(f.file_name LIKE ? OR f.title LIKE ? OR f.description LIKE ? OR f.tags LIKE ?)');
    for (let i = 0; i < 4; i++) params.push(`%${q}%`);
  }
  if (typeof query.category === 'string' && query.category) { where.push('f.category = ?'); params.push(query.category.slice(0, 120)); }
  if (query.type === 'image') where.push("f.mime_type LIKE 'image/%'");
  if (query.type === 'document') where.push("f.mime_type NOT LIKE 'image/%'");
  if (query.lang && ['en', 'es', 'other'].includes(query.lang)) { where.push('f.lang = ?'); params.push(query.lang); }
  const sorts = { created_at: 'f.created_at', title: 'f.title', file_name: 'f.file_name', size_bytes: 'f.size_bytes', category: 'f.category' };
  const order = `${sorts[query.sort] || 'f.created_at'} ${query.dir === 'asc' ? 'ASC' : 'DESC'}`;
  const sql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [{ total }] = await db.query(`SELECT COUNT(*) AS total FROM repo_files f ${sql}`, params);
  const data = await db.query(`${SELECT} ${sql} ORDER BY ${order}, f.id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  return { data, meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } };
}

async function update(id, body, user) {
  const row = await getOne(id);
  const meta = metadata(body, { partial: true });
  const driver = storage.forStorage(row.storage);
  const changes = { ...meta };

  if (meta.file_name && meta.file_name !== row.file_name) {
    // Keep the original extension so the type can't be changed by renaming
    const ext = path.extname(row.file_name);
    const wanted = path.extname(meta.file_name).toLowerCase() === ext.toLowerCase() ? meta.file_name : meta.file_name + ext;
    const r = await driver.rename(row.item_id, wanted);
    changes.file_name = r.fileName;
    if (r.webUrl) changes.web_url = r.webUrl;
  } else delete changes.file_name;

  if ('category' in meta && (meta.category || null) !== (row.category || null)) {
    const folder = folderFromCategory(meta.category);
    await driver.move(row.item_id, folder);
    changes.folder = folder;
  }

  const cols = Object.keys(changes);
  if (cols.length) {
    await db.query(
      `UPDATE repo_files SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')}, updated_by = ? WHERE id = ?`,
      [...cols.map((c) => changes[c]), user.id, id]
    );
  }
  return getOne(id);
}

async function remove(id) {
  const row = await db.queryOne('SELECT id, storage, item_id FROM repo_files WHERE id = ?', [id]);
  if (!row) throw new HttpError(404, 'Archivo no encontrado.');
  await storage.forStorage(row.storage).remove(row.item_id);
  await db.query('DELETE FROM repo_files WHERE id = ?', [id]);
}

/** Sends the file: redirect to OneDrive's temporary link, or stream the local copy */
async function download(id, res, inline) {
  const row = await db.queryOne('SELECT storage, item_id, file_name, mime_type FROM repo_files WHERE id = ?', [id]);
  if (!row) throw new HttpError(404, 'Archivo no encontrado.');
  const out = await storage.forStorage(row.storage).download(row.item_id);
  if (out.redirectUrl) return res.redirect(302, out.redirectUrl);
  res.set('Content-Type', row.mime_type);
  res.set('X-Content-Type-Options', 'nosniff');
  // Images can be previewed inline; documents are always downloaded
  const disp = inline && /^image\//.test(row.mime_type) ? 'inline' : 'attachment';
  res.set('Content-Disposition', `${disp}; filename*=UTF-8''${encodeURIComponent(row.file_name)}`);
  out.stream.on('error', () => res.destroy()).pipe(res);
}

async function categories() {
  const rows = await db.query("SELECT category, COUNT(*) AS n FROM repo_files WHERE category IS NOT NULL AND category <> '' GROUP BY category ORDER BY category");
  return rows;
}

/** Imports files added directly in OneDrive and flags files deleted there */
async function sync() {
  const driver = storage.onedrive;
  const items = await driver.list();
  const existing = await db.query("SELECT id, item_id FROM repo_files WHERE storage = 'onedrive'");
  const known = new Map(existing.map((r) => [r.item_id, r.id]));
  let added = 0;
  let updated = 0;
  for (const it of items) {
    const ext = path.extname(it.fileName).toLowerCase();
    if (known.has(it.itemId)) {
      await db.query('UPDATE repo_files SET file_name = ?, folder = ?, size_bytes = ?, web_url = ?, is_missing = 0 WHERE id = ?',
        [it.fileName, it.folder, it.size, it.webUrl, known.get(it.itemId)]);
      known.delete(it.itemId);
      updated++;
    } else if (TYPES[ext]) {
      await db.query(
        `INSERT INTO repo_files (storage, item_id, folder, file_name, mime_type, size_bytes, title, category, web_url)
         VALUES ('onedrive', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [it.itemId, it.folder, it.fileName, TYPES[ext][0], it.size, path.basename(it.fileName, ext), it.folder || null, it.webUrl]
      );
      added++;
    }
  }
  const missingIds = [...known.values()];
  if (missingIds.length) await db.query('UPDATE repo_files SET is_missing = 1 WHERE id IN (?)', [missingIds]);
  return { added, updated, missing: missingIds.length };
}

async function status() {
  const s = await storage.active().status();
  const [{ n, bytes }] = await db.query('SELECT COUNT(*) AS n, COALESCE(SUM(size_bytes), 0) AS bytes FROM repo_files');
  return { ...s, files: n, bytes: Number(bytes), maxMb: env.repository.maxMb, extensions: EXTENSIONS };
}

module.exports = { receive, create, list, getOne, update, remove, download, categories, sync, status };
