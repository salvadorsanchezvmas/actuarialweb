/**
 * Website texts editor: reads and writes front/i18n/en.json and es.json.
 * Only existing keys can be edited (the keys are wired into the HTML).
 * Every save keeps a timestamped backup in storage/backups/.
 */
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const env = require('../config/env');
const { HttpError } = require('../utils/http');

const LANGS = ['en', 'es'];
// Texts may contain the same inline markup the site uses (title <span>, links, line breaks)
const INLINE = {
  allowedTags: ['span', 'strong', 'em', 'b', 'i', 'a', 'br', 'small', 'sup', 'time', 'abbr'],
  allowedAttributes: { a: ['href', 'class', 'target', 'rel'], span: ['class', 'data-year'], time: ['datetime'] },
  allowedSchemes: ['https', 'http', 'mailto', 'tel'],
};

const file = (lang) => path.join(env.paths.i18n, `${lang}.json`);
const readLang = async (lang) => JSON.parse(await fs.promises.readFile(file(lang), 'utf8'));

async function writeAtomic(target, data) {
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.promises.rename(tmp, target);
}

/** Section of the site a key belongs to, for grouping in SAW. */
function groupOf(key) {
  if (key.startsWith('meta.')) return 'SEO / Meta';
  if (key.startsWith('js.')) return 'Mensajes del sistema';
  return 'Textos del sitio';
}

async function list() {
  const [en, es] = await Promise.all(LANGS.map(readLang));
  return Object.keys(en).sort().map((key) => ({ key, group: groupOf(key), en: en[key], es: es[key] ?? '' }));
}

async function save(changes) {
  if (!Array.isArray(changes) || !changes.length) throw new HttpError(422, 'No hay cambios para guardar.');
  if (changes.length > 500) throw new HttpError(413, 'Demasiados cambios en una sola operación.');
  const dicts = Object.fromEntries(await Promise.all(LANGS.map(async (l) => [l, await readLang(l)])));

  const errors = [];
  for (const c of changes) {
    if (!c || typeof c.key !== 'string' || !(c.key in dicts.en)) { errors.push({ field: String(c && c.key), message: 'Clave inexistente.' }); continue; }
    for (const lang of LANGS) {
      if (typeof c[lang] !== 'string') continue;
      const value = sanitizeHtml(c[lang], INLINE).trim();
      if (!value) { errors.push({ field: c.key, message: `El texto (${lang.toUpperCase()}) no puede quedar vacío.` }); continue; }
      if (value.length > 5000) { errors.push({ field: c.key, message: 'Texto demasiado largo.' }); continue; }
      dicts[lang][c.key] = value;
    }
  }
  if (errors.length) throw new HttpError(422, 'Revise los textos marcados.', errors);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.promises.mkdir(env.paths.backups, { recursive: true });
  for (const lang of LANGS) {
    await fs.promises.copyFile(file(lang), path.join(env.paths.backups, `${lang}-${stamp}.json`));
    await writeAtomic(file(lang), dicts[lang]);
  }
  return { saved: changes.length };
}

module.exports = { list, save };
