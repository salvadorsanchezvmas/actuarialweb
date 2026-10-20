/**
 * Actuarial Factor — language engine (English / Spanish)
 *
 * Reads i18n/<lang>.json and updates the page:
 *   data-i18n="key"                 → textContent
 *   data-i18n-html="key"            → innerHTML (texts with inline markup)
 *   data-i18n-attr="alt:key|aria-label:key2"  → attributes (alt, aria-label,
 *                                     placeholder, title, meta content…)
 *   <html lang>, og:locale and the EN/ES switch state.
 *
 * Language priority: ?lang=es → saved choice → browser language → English.
 * API:  AF_I18N.ready (Promise) · AF_I18N.lang · AF_I18N.t(key, vars)
 *       AF_I18N.setLang('es') · AF_I18N.apply(rootElement)
 * Event: document 'af:langchange' { detail: { lang } } after every change.
 */
(function (window, document) {
  'use strict';

  var SUPPORTED = ['en', 'es'];
  var DEFAULT = 'en';
  var STORAGE_KEY = 'af_lang';
  var LOCALES = { en: 'en_US', es: 'es_MX' };
  var cache = {};

  function storageGet() { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } }
  function storageSet(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* private mode */ } }

  function detect() {
    var param = new URLSearchParams(window.location.search).get('lang');
    if (param && SUPPORTED.indexOf(param) !== -1) { storageSet(param); return param; }
    var saved = storageGet();
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return nav.toLowerCase().indexOf('es') === 0 ? 'es' : DEFAULT;
  }

  function load(lang) {
    if (cache[lang]) return Promise.resolve(cache[lang]);
    return fetch('i18n/' + lang + '.json', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('Missing language file: ' + lang);
        return res.json();
      })
      .then(function (dict) { cache[lang] = dict; return dict; });
  }

  var I18N = window.AF_I18N = {
    lang: DEFAULT,
    dict: {},
    supported: SUPPORTED,

    /** Translate a key; {vars} are replaced. Falls back to the key's English text or the key. */
    t: function (key, vars) {
      var value = I18N.dict[key];
      if (value === undefined && cache.en) value = cache.en[key];
      if (value === undefined) value = key;
      if (vars) Object.keys(vars).forEach(function (k) { value = value.split('{' + k + '}').join(vars[k]); });
      return value;
    },

    /** Apply the current dictionary to a subtree (default: whole document). */
    apply: function (root) {
      root = root || document;
      var dict = I18N.dict;
      var each = function (sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), fn); };

      each('[data-i18n]', function (el) {
        var v = dict[el.getAttribute('data-i18n')];
        if (v !== undefined && el.textContent !== v) el.textContent = v;
      });
      each('[data-i18n-html]', function (el) {
        var v = dict[el.getAttribute('data-i18n-html')];
        if (v !== undefined && el.innerHTML !== v) el.innerHTML = v; // trusted: our own JSON files
      });
      each('[data-i18n-attr]', function (el) {
        el.getAttribute('data-i18n-attr').split('|').forEach(function (pair) {
          var i = pair.indexOf(':');
          var v = dict[pair.slice(i + 1)];
          if (i > 0 && v !== undefined) el.setAttribute(pair.slice(0, i), v);
        });
      });
    },

    /** Change language, persist it and re-render. */
    setLang: function (lang) {
      if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT;
      return load(lang).then(function (dict) {
        var changed = lang !== I18N.lang;
        I18N.lang = lang;
        I18N.dict = dict;
        storageSet(lang);
        document.documentElement.lang = lang;
        var ogLocale = document.querySelector('meta[property="og:locale"]');
        var ogAlt = document.querySelector('meta[property="og:locale:alternate"]');
        if (ogLocale) ogLocale.setAttribute('content', LOCALES[lang]);
        if (ogAlt) ogAlt.setAttribute('content', LOCALES[lang === 'en' ? 'es' : 'en']);
        Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
        });
        I18N.apply(document);
        document.dispatchEvent(new CustomEvent('af:langchange', { detail: { lang: lang, changed: changed } }));
        return lang;
      });
    }
  };

  // English is always loaded too: it is the fallback for missing keys
  var initial = detect();
  I18N.ready = load(DEFAULT)
    .then(function () { return I18N.setLang(initial); })
    .catch(function (err) {
      console.warn('[i18n]', err.message);
      return DEFAULT;
    });

  // Language switch buttons (header + side menu)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-lang]');
    if (!btn) return;
    e.preventDefault();
    I18N.setLang(btn.getAttribute('data-lang'));
  });
})(window, document);
