/**
 * Language helpers. The front sends ?lang=en|es (GET), "lang" in the JSON body
 * (POST) and an Accept-Language header.
 */
const SUPPORTED = ['en', 'es'];

function getLang(req) {
  const fromReq = (req.query && req.query.lang) || (req.body && req.body.lang) || req.get('accept-language') || '';
  const code = String(fromReq).slice(0, 2).toLowerCase();
  return SUPPORTED.includes(code) ? code : 'en';
}

/**
 * SQL select fragment for a translatable column: in Spanish it reads `<col>_es`
 * and falls back to the English column when the translation is empty.
 * `column` must be a hard-coded identifier (never user input).
 */
function tcol(column, lang, alias) {
  const [table, name] = column.includes('.') ? column.split('.') : [null, column];
  const ref = (n) => (table ? `${table}.${n}` : n);
  const as = alias || name;
  return lang === 'es' ? `COALESCE(NULLIF(${ref(name + '_es')}, ''), ${ref(name)}) AS ${as}` : `${ref(name)} AS ${as}`;
}

module.exports = { SUPPORTED, getLang, tcol };
