/**
 * Cookie consent (EN/ES through AF_I18N).
 *
 * - First visit (or new CONSENT_VERSION): the preferences pop-up opens and
 *   asks for a choice. Afterwards the floating button reopens it.
 * - The choice is saved in localStorage and in a first-party cookie
 *   (af_consent) so the server could read it too.
 * - Optional content only loads with consent:
 *     <script type="text/plain" data-consent="analytics" src="…"></script>
 *     <iframe data-consent="functional" data-src="…"></iframe>
 * - API: AF_CONSENT.has('analytics') · AF_CONSENT.open() ·
 *        document 'af:consent' event { detail: choices }
 */
(function (window, document) {
  'use strict';

  var CONSENT_VERSION = 1;
  var KEY = 'af_consent';
  var CATEGORIES = ['necessary', 'functional', 'analytics', 'marketing'];
  var OPTIONAL = CATEGORIES.slice(1);
  var t = function (k) { return window.AF_I18N ? window.AF_I18N.t('js.cookies.' + k) : k; };

  /* ---------- Storage ---------- */
  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && c.version === CONSENT_VERSION ? c : null;
    } catch (e) { return null; }
  }
  function save(choices) {
    var data = { version: CONSENT_VERSION, date: new Date().toISOString(), necessary: true };
    OPTIONAL.forEach(function (k) { data[k] = !!choices[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
    var cookie = OPTIONAL.map(function (k) { return k + ':' + (data[k] ? 1 : 0); }).join('|');
    document.cookie = KEY + '=' + encodeURIComponent('v' + CONSENT_VERSION + '|' + cookie) +
      '; Max-Age=' + 60 * 60 * 24 * 365 + '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    current = data;
    apply();
    document.dispatchEvent(new CustomEvent('af:consent', { detail: data }));
  }
  var current = read();
  var has = function (cat) { return cat === 'necessary' || !!(current && current[cat]); };

  /* ---------- Load consented content ---------- */
  function apply() {
    Array.prototype.forEach.call(document.querySelectorAll('script[type="text/plain"][data-consent]'), function (old) {
      if (!has(old.getAttribute('data-consent'))) return;
      var s = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (a) { if (a.name !== 'type' && a.name !== 'data-consent') s.setAttribute(a.name, a.value); });
      s.text = old.text;
      old.parentNode.replaceChild(s, old);
    });
    Array.prototype.forEach.call(document.querySelectorAll('iframe[data-consent][data-src]'), function (frame) {
      var ok = has(frame.getAttribute('data-consent'));
      var note = frame.parentNode.querySelector('.consent-placeholder');
      if (ok) {
        if (!frame.getAttribute('src')) frame.setAttribute('src', frame.getAttribute('data-src'));
        frame.hidden = false;
        if (note) note.remove();
      } else if (!note) {
        frame.hidden = true;
        note = document.createElement('div');
        note.className = 'consent-placeholder';
        note.innerHTML = '<p>' + t('map_blocked') + '</p><button type="button" class="btn btn--navy" data-consent-enable="' + frame.getAttribute('data-consent') + '">' + t('map_enable') + '</button>';
        frame.parentNode.appendChild(note);
      }
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-consent-enable]');
    if (!b) return;
    var choices = {};
    OPTIONAL.forEach(function (k) { choices[k] = has(k); });
    choices[b.getAttribute('data-consent-enable')] = true;
    save(choices);
  });

  /* ---------- UI ---------- */
  var ICON = '<svg viewBox="0 0 40 24" aria-hidden="true"><rect x="1" y="1" width="38" height="22" rx="11" fill="currentColor" opacity=".25"/><circle cx="12" cy="12" r="9" fill="#fff"/><path d="M8 12.2l2.6 2.6L16 9.4" fill="none" stroke="#232d46" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 8.5l7 7M33 8.5l-7 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var fab, modal, lastFocus;

  function buildButton() {
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'consent-fab';
    fab.innerHTML = ICON + '<span class="consent-fab__tip" role="tooltip"></span>';
    fab.addEventListener('click', open);
    document.body.appendChild(fab);
    labelButton();
  }
  function labelButton() {
    fab.setAttribute('aria-label', t('button'));
    fab.querySelector('.consent-fab__tip').textContent = t('button');
  }

  function categoryRow(cat) {
    var id = 'consent-' + cat;
    var control = cat === 'necessary'
      ? '<span class="consent-cat__always">' + t('always') + '</span>'
      : '<label class="consent-switch"><input type="checkbox" id="' + id + '" data-cat="' + cat + '"' + (has(cat) ? ' checked' : '') + '><span class="consent-switch__track" aria-hidden="true"></span><span class="sr-only">' + t(cat) + '</span></label>';
    return '<div class="consent-cat">' +
      '<div class="consent-cat__head">' +
        '<button type="button" class="consent-cat__toggle" aria-expanded="false" aria-controls="' + id + '-desc">' + t(cat) + '</button>' + control +
      '</div>' +
      '<p class="consent-cat__desc" id="' + id + '-desc" hidden>' + t(cat + '_desc') + '</p>' +
    '</div>';
  }

  function render() {
    var canClose = !!current;
    modal.innerHTML =
      '<div class="consent-modal__box" role="dialog" aria-modal="true" aria-labelledby="consent-title">' +
        '<div class="consent-modal__head">' +
          '<img src="assets/logos/logo-10th-color-crop.png" alt="Actuarial Factor" width="120" height="55">' +
          (canClose ? '<button type="button" class="consent-modal__close" data-consent-close aria-label="' + t('close') + '">✕</button>' : '') +
        '</div>' +
        '<div class="consent-modal__body">' +
          '<h2 id="consent-title">' + t('title') + '</h2>' +
          '<p>' + t('intro') + '</p>' +
          '<p>' + t('intro2') + '</p>' +
          '<h3>' + t('manage') + '</h3>' +
          '<div class="consent-cats">' + CATEGORIES.map(categoryRow).join('') + '</div>' +
        '</div>' +
        '<div class="consent-modal__foot">' +
          '<button type="button" class="btn btn--outline" data-consent-reject>' + t('reject') + '</button>' +
          '<button type="button" class="btn btn--navy" data-consent-confirm>' + t('confirm') + '</button>' +
          '<button type="button" class="btn btn--gold" data-consent-all>' + t('accept_all') + '</button>' +
        '</div>' +
      '</div>';

    Array.prototype.forEach.call(modal.querySelectorAll('.consent-cat__toggle'), function (b) {
      b.addEventListener('click', function () {
        var desc = document.getElementById(b.getAttribute('aria-controls'));
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        desc.hidden = !open;
      });
    });
    var choose = function (fn) {
      return function () {
        var choices = {};
        OPTIONAL.forEach(function (k) { choices[k] = fn(k); });
        save(choices);
        close();
        toast(t('saved'));
      };
    };
    modal.querySelector('[data-consent-reject]').addEventListener('click', choose(function () { return false; }));
    modal.querySelector('[data-consent-all]').addEventListener('click', choose(function () { return true; }));
    modal.querySelector('[data-consent-confirm]').addEventListener('click', choose(function (k) {
      var box = modal.querySelector('[data-cat="' + k + '"]');
      return box && box.checked;
    }));
    var x = modal.querySelector('[data-consent-close]');
    if (x) x.addEventListener('click', close);
  }

  function onKey(e) {
    if (e.key === 'Escape' && current) { close(); return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(modal.querySelectorAll('button, a, input'), function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  function open() {
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'consent-modal';
      document.body.appendChild(modal);
    }
    lastFocus = document.activeElement;
    render();
    modal.hidden = false;
    document.documentElement.classList.add('consent-open');
    document.addEventListener('keydown', onKey);
    var first = modal.querySelector('.consent-modal__body h2');
    first.setAttribute('tabindex', '-1');
    first.focus();
  }
  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.classList.remove('consent-open');
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'consent-toast';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  /* ---------- Boot: after the language is applied ---------- */
  function boot() {
    buildButton();
    apply();
    if (!current) setTimeout(open, 900); // let the loader fade out first
    document.addEventListener('af:langchange', function () {
      labelButton();
      if (modal && !modal.hidden) render();
      Array.prototype.forEach.call(document.querySelectorAll('.consent-placeholder'), function (n) { n.remove(); });
      apply();
    });
  }
  var ready = window.AF_I18N && window.AF_I18N.ready ? window.AF_I18N.ready : Promise.resolve();
  ready.then(function () {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  });

  window.AF_CONSENT = { has: has, open: open, get: function () { return current; } };
})(window, document);
