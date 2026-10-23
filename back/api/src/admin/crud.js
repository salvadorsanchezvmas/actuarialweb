/**
 * Generic CRUD for the resources in ./resources.js.
 * Column names always come from the resource definition (never from the
 * request); values always go through placeholders.
 */
const bcrypt = require('bcryptjs');
const sanitizeHtml = require('sanitize-html');
const db = require('../config/db');
const { HttpError } = require('../utils/http');

const HTML_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'figure', 'figcaption']),
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'width', 'height', 'loading'], a: ['href', 'target', 'rel'] },
  allowedSchemes: ['https', 'http', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
};
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MEDIA_RE = /^(uploads|img|assets)\/[A-Za-z0-9_\-./]+$/;
const WRITABLE = (f) => f.type !== 'readonly';

const toMysqlDateTime = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

/** Validates and normalizes one value. Returns { value } or { error }. */
async function normalize(field, raw) {
  const empty = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
  if (empty) {
    if (field.type === 'bool') return { value: 0 };
    if (field.required && field.type !== 'password') return { error: 'Campo obligatorio.' };
    return { value: null };
  }
  let v = typeof raw === 'string' ? raw.trim() : raw;
  const tooLong = (s) => field.max && String(s).length > field.max;

  switch (field.type) {
    case 'text': case 'textarea':
      v = String(v);
      if (tooLong(v)) return { error: `Máximo ${field.max} caracteres.` };
      return { value: v };
    case 'html':
      return { value: sanitizeHtml(String(v), HTML_OPTIONS) };
    case 'slug':
      v = String(v).toLowerCase();
      if (!SLUG_RE.test(v)) return { error: 'Use minúsculas, números y guiones (ej. mi-entrada).' };
      if (tooLong(v)) return { error: `Máximo ${field.max} caracteres.` };
      return { value: v };
    case 'email':
      v = String(v).toLowerCase();
      if (!EMAIL_RE.test(v) || tooLong(v)) return { error: 'Correo no válido.' };
      return { value: v };
    case 'url':
      if (!/^https?:\/\/[^\s]+$/i.test(v) || tooLong(v)) return { error: 'URL no válida (debe iniciar con https://).' };
      return { value: String(v) };
    case 'int': {
      const n = Number(v);
      if (!Number.isInteger(n)) return { error: 'Debe ser un número entero.' };
      return { value: n };
    }
    case 'decimal': {
      const n = Number(v);
      if (!Number.isFinite(n)) return { error: 'Debe ser un número.' };
      if (field.min !== undefined && n < field.min) return { error: `Mínimo ${field.min}.` };
      if (field.max !== undefined && n > field.max) return { error: `Máximo ${field.max}.` };
      return { value: n };
    }
    case 'bool':
      return { value: v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0 };
    case 'enum':
      if (!field.values.includes(v)) return { error: 'Opción no válida.' };
      return { value: v };
    case 'date':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: 'Fecha no válida.' };
      return { value: v };
    case 'datetime': {
      const d = new Date(v);
      if (isNaN(d)) return { error: 'Fecha y hora no válidas.' };
      return { value: toMysqlDateTime(d) }; // stored in UTC
    }
    case 'media':
      if (!MEDIA_RE.test(v) || v.includes('..')) return { error: 'Seleccione un archivo de la biblioteca.' };
      return { value: v };
    case 'ref': {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) return { error: 'Opción no válida.' };
      return { value: n };
    }
    case 'password':
      if (field.min && String(v).length < field.min) return { error: `Mínimo ${field.min} caracteres.` };
      if (tooLong(v)) return { error: `Máximo ${field.max} caracteres.` };
      return { value: await bcrypt.hash(String(v), 12) };
    default:
      return { error: 'Tipo de campo no soportado.' };
  }
}

/** Builds the column → value map for an insert/update from the request body. */
async function buildValues(resource, body, { isCreate }) {
  const values = {};
  const errors = [];
  for (const field of resource.fields.filter(WRITABLE)) {
    if (field.createOnly && !isCreate) continue;
    const present = Object.prototype.hasOwnProperty.call(body, field.name);
    // Updates are partial; a password is only changed when typed
    if (!isCreate && !present) continue;
    if (field.type === 'password' && (!present || body[field.name] === '')) {
      if (isCreate) errors.push({ field: field.name, message: 'Defina una contraseña.' });
      continue;
    }
    const { value, error } = await normalize(field, body[field.name]);
    if (error) errors.push({ field: field.name, message: error });
    else values[field.column || field.name] = value;
  }
  if (errors.length) throw new HttpError(422, 'Revise los campos marcados.', errors);
  return values;
}

/** Fields returned to SAW (never password hashes). */
const readableColumns = (resource) => ['id', ...resource.fields.filter((f) => f.type !== 'password').map((f) => f.name)];

function whereFromQuery(resource, query) {
  const where = [];
  const params = [];
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  if (q && resource.search) {
    where.push('(' + resource.search.map((c) => `\`${c}\` LIKE ?`).join(' OR ') + ')');
    resource.search.forEach(() => params.push(`%${q}%`));
  }
  const filter = query.filter && typeof query.filter === 'object' ? query.filter : {};
  for (const name of resource.filters || []) {
    const val = filter[name];
    if (val === undefined || val === '') continue;
    const field = resource.fields.find((f) => f.name === name);
    if (field.values && !field.values.includes(val)) continue;
    if (field.type === 'ref' && !/^\d+$/.test(String(val))) continue;
    where.push(`\`${name}\` = ?`);
    params.push(val);
  }
  return { sql: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

function orderFromQuery(resource, query) {
  const allowed = ['id', ...resource.fields.filter((f) => f.list).map((f) => f.name)];
  if (query.sort && allowed.includes(query.sort)) {
    return `\`${query.sort}\` ${query.dir === 'asc' ? 'ASC' : 'DESC'}`;
  }
  return resource.orderBy || 'id DESC';
}

async function list(resource, query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 25, 1), 100);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const { sql, params } = whereFromQuery(resource, query);
  const cols = ['id', ...resource.fields.filter((f) => f.list).map((f) => f.name)].map((c) => `\`${c}\``).join(', ');
  const [{ total }] = await db.query(`SELECT COUNT(*) AS total FROM \`${resource.table}\` ${sql}`, params);
  const rows = await db.query(
    `SELECT ${cols} FROM \`${resource.table}\` ${sql} ORDER BY ${orderFromQuery(resource, query)} LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  return { data: rows, meta: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } };
}

async function get(resource, id) {
  const cols = readableColumns(resource).map((c) => `\`${c}\``).join(', ');
  const row = await db.queryOne(`SELECT ${cols} FROM \`${resource.table}\` WHERE id = ?`, [id]);
  if (!row) throw new HttpError(404, 'Registro no encontrado.');
  return row;
}

function dbError(err) {
  if (err.code === 'ER_DUP_ENTRY') return new HttpError(409, 'Ya existe un registro con ese valor (slug o correo duplicado).');
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return new HttpError(409, 'No se puede eliminar: otros registros dependen de este.');
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return new HttpError(422, 'La opción seleccionada ya no existe.');
  return err;
}

async function create(resource, body) {
  if (resource.readOnly || resource.noCreate) throw new HttpError(405, 'Este apartado no permite crear registros.');
  const values = { ...(resource.defaults ? resource.defaults() : {}), ...(await buildValues(resource, body, { isCreate: true })) };
  if (resource.beforeSave) resource.beforeSave(values, { isCreate: true });
  const cols = Object.keys(values);
  try {
    const result = await db.query(
      `INSERT INTO \`${resource.table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => values[c])
    );
    return get(resource, result.insertId);
  } catch (err) { throw dbError(err); }
}

async function update(resource, id, body) {
  if (resource.readOnly) throw new HttpError(405, 'Este apartado es de solo lectura.');
  await get(resource, id); // 404 if missing
  const values = await buildValues(resource, body, { isCreate: false });
  if (resource.beforeSave) resource.beforeSave(values, { isCreate: false });
  const cols = Object.keys(values);
  if (cols.length) {
    try {
      await db.query(
        `UPDATE \`${resource.table}\` SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`,
        [...cols.map((c) => values[c]), id]
      );
    } catch (err) { throw dbError(err); }
  }
  return { row: await get(resource, id), changed: cols };
}

async function remove(resource, id) {
  if (resource.readOnly) throw new HttpError(405, 'Este apartado es de solo lectura.');
  try {
    const result = await db.query(`DELETE FROM \`${resource.table}\` WHERE id = ?`, [id]);
    if (!result.affectedRows) throw new HttpError(404, 'Registro no encontrado.');
  } catch (err) { throw dbError(err); }
}

/** CSV export with the active search/filters (UTF-8 BOM for Excel). */
async function exportCsv(resource, query) {
  const { sql, params } = whereFromQuery(resource, query);
  const fields = resource.fields.filter((f) => f.type !== 'password');
  const cols = ['id', ...fields.map((f) => f.name)];
  const rows = await db.query(
    `SELECT ${cols.map((c) => `\`${c}\``).join(', ')} FROM \`${resource.table}\` ${sql} ORDER BY ${orderFromQuery(resource, query)} LIMIT 50000`,
    params
  );
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    let s = v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // avoid spreadsheet formula injection
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['ID', ...fields.map((f) => f.label)].map(cell).join(',');
  return '﻿' + [header, ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
}

module.exports = { list, get, create, update, remove, exportCsv };
