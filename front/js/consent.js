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
    fab.addEventListener('click', function (e) {
      if (dragged) { e.preventDefault(); dragged = false; return; } // end of a drag, not a click
      open(false);
    });
    document.body.appendChild(fab);
    labelButton();
    makeDraggable();
  }

  /* The button can be dragged anywhere so it never hides content; the spot is remembered */
  var POS_KEY = 'af_fab_pos';
  var dragged = false;
  function placeFab(r, b) {
    var m = 8, w = fab.offsetWidth || 56, h = fab.offsetHeight || 56;
    r = Math.min(Math.max(r, m), window.innerWidth - w - m);
    b = Math.min(Math.max(b, m), window.innerHeight - h - m);
    fab.style.right = r + 'px';
    fab.style.bottom = b + 'px';
    return { r: r, b: b };
  }
  function makeDraggable() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(POS_KEY)); } catch (e) { /* storage blocked */ }
    if (saved && typeof saved.r === 'number' && typeof saved.b === 'number') placeFab(saved.r, saved.b);
    window.addEventListener('resize', function () {
      if (fab.style.right) placeFab(parseFloat(fab.style.right), parseFloat(fab.style.bottom));
    });

    var start = null;
    fab.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var rect = fab.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY, r: window.innerWidth - rect.right, b: window.innerHeight - rect.bottom - (parseFloat(getComputedStyle(fab).marginBottom) || 0), moving: false };
      dragged = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (!start) return;
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.moving && Math.abs(dx) + Math.abs(dy) < 6) return;
      if (!start.moving) { start.moving = true; fab.classList.add('is-dragging'); try { fab.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      e.preventDefault();
      placeFab(start.r - dx, start.b - dy);
    });
    function end() {
      if (!start) return;
      if (start.moving) {
        dragged = true;
        fab.classList.remove('is-dragging');
        try { localStorage.setItem(POS_KEY, JSON.stringify({ r: parseFloat(fab.style.right), b: parseFloat(fab.style.bottom) })); } catch (e) { /* storage blocked */ }
        setTimeout(function () { dragged = false; }, 50);
      }
      start = null;
    }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
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

  /**
   * Non-blocking card in the bottom-right corner.
   *  compact  → short text + Reject · Accept · Customize   (first visit starts here)
   *  expanded → categories with switches + Save my choices
   */
  var expanded = false;
  function render() {
    var canClose = !!current;
    var actions = expanded
      ? '<button type="button" class="btn btn--outline" data-consent-reject>' + t('reject_short') + '</button>' +
        '<button type="button" class="btn btn--navy" data-consent-confirm>' + t('save') + '</button>' +
        '<button type="button" class="btn btn--gold" data-consent-all>' + t('accept_short') + '</button>'
      : '<button type="button" class="btn btn--outline" data-consent-reject>' + t('reject_short') + '</button>' +
        '<button type="button" class="btn btn--gold" data-consent-all>' + t('accept_short') + '</button>' +
        '<button type="button" class="consent-panel__link" data-consent-more aria-expanded="false">' + t('customize') + '</button>';
    modal.innerHTML =
      '<div class="consent-panel' + (expanded ? ' is-expanded' : '') + '" role="dialog" aria-modal="false" aria-labelledby="consent-title">' +
        '<div class="consent-panel__head">' +
          '<strong id="consent-title" tabindex="-1">' + t('title') + '</strong>' +
          (expanded ? '<button type="button" class="consent-panel__link" data-consent-back>‹ ' + t('back') + '</button>' : '') +
          (canClose ? '<button type="button" class="consent-panel__close" data-consent-close aria-label="' + t('close') + '">✕</button>' : '') +
        '</div>' +
        '<div class="consent-panel__body">' +
          (expanded
            ? '<p>' + t('intro2') + '</p><div class="consent-cats">' + CATEGORIES.map(categoryRow).join('') + '</div>'
            : '<p>' + t('short') + ' <a href="privacy-policy.html">' + t('policy') + '</a>.</p>') +
        '</div>' +
        '<div class="consent-panel__actions">' + actions + '</div>' +
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
    var confirmBtn = modal.querySelector('[data-consent-confirm]');
    if (confirmBtn) confirmBtn.addEventListener('click', choose(function (k) {
      var box = modal.querySelector('[data-cat="' + k + '"]');
      return box && box.checked;
    }));
    var more = modal.querySelector('[data-consent-more]');
    if (more) more.addEventListener('click', function () { expanded = true; render(); focusTitle(); });
    var back = modal.querySelector('[data-consent-back]');
    if (back) back.addEventListener('click', function () { expanded = false; render(); focusTitle(); });
    var x = modal.querySelector('[data-consent-close]');
    if (x) x.addEventListener('click', close);
  }
  function focusTitle() { var h = modal.querySelector('#consent-title'); if (h) h.focus(); }

  function onKey(e) { if (e.key === 'Escape' && current) close(); }

  /** auto = shown by itself on the first visit (does not take the focus) */
  function open(auto) {
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'consent-wrap';
      document.body.appendChild(modal);
    }
    lastFocus = document.activeElement;
    expanded = false; // always starts minimized
    render();
    modal.hidden = false;
    document.documentElement.classList.add('consent-visible');
    document.addEventListener('keydown', onKey);
    if (auto !== true) focusTitle();
  }
  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.classList.remove('consent-visible');
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus && lastFocus !== document.body) lastFocus.focus();
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
    if (!current) setTimeout(function () { open(true); }, 900); // minimized card once the loader fades out
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
