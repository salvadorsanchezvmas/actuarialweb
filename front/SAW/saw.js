/**
 * SAW — Actuarial Factor content admin.
 * Single-page app without a build step. Screens are generated from
 * GET /api/admin/schema (the same definitions the API validates against).
 *
 * Routes (hash):
 *   #/                 dashboard
 *   #/texts            website texts (i18n EN/ES)
 *   #/media            media library
 *   #/r/<resource>     table      ·  #/r/<resource>/new  ·  #/r/<resource>/<id>
 */
(function () {
  'use strict';

  var API = '/api';
  var state = { me: null, siteUrl: '', schema: [], byKey: {}, uploadMaxMb: 25, mediaTypes: [], features: {}, options: {}, list: {}, dirty: false };

  /* ======================================================================
     Helpers
     ====================================================================== */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var isIsoDate = function (v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v); };
  function formatDate(v, withTime) {
    var d = new Date(v);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
      (withTime === false ? '' : ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()));
  }
  function formatSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
  var mediaUrl = function (p) { return p ? '/' + String(p).replace(/^\//, '') : ''; };
  var isImage = function (p, mime) { return mime ? /^image\//.test(mime) : /\.(jpe?g|png|webp|gif)$/i.test(p || ''); };
  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 150);
  }
  function toLocalInput(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /** Spanish labels and badge colors for enum values */
  var LABELS = {
    draft: 'Borrador', published: 'Publicada', open: 'Abierta', closed: 'Cerrada', new: 'Nuevo', in_progress: 'En seguimiento',
    subscribed: 'Suscrito', unsubscribed: 'Dado de baja', admin: 'Administrador', editor: 'Editor', client: 'Cliente',
    active: 'Activo', disabled: 'Desactivado', sent: 'Enviado', failed: 'Fallido', en: 'Inglés', es: 'Español',
    pricing: 'Tarificación', reserving: 'Reservas', captive: 'Cautivas', mergers: 'Fusiones y adquisiciones', other: 'Otro',
    uploader: 'Carga de archivos', onedrive: 'OneDrive', local: 'Servidor local',
    reserve: 'Reservas (ícono)', shield: 'Escudo (ícono)', merge: 'Fusión (ícono)'
  };
  var BADGE = { published: 'ok', open: 'ok', subscribed: 'ok', active: 'ok', sent: 'ok', closed: '', draft: 'warn', new: 'info', in_progress: 'warn', unsubscribed: 'bad', disabled: 'bad', failed: 'bad', admin: 'info' };
  var ICONS = { file: '✎', tag: '#', briefcase: '◆', users: '☺', star: '★', chart: '▲', pin: '⌖', badge: '✦', inbox: '✉', mail: '@', key: '⚿', send: '➤' };
  var label = function (v) { return LABELS[v] || v; };
  var badge = function (v) { return '<span class="saw-badge' + (BADGE[v] ? ' saw-badge--' + BADGE[v] : '') + '">' + esc(label(v)) + '</span>'; };

  /* ---------- API ---------- */
  function api(method, path, body) {
    var opts = { method: method, credentials: 'same-origin', headers: { Accept: 'application/json', 'X-Requested-With': 'fetch' } };
    if (body instanceof FormData) opts.body = body;
    else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch(API + path, opts).then(function (res) {
      if (res.status === 401) { goLogin(); throw { status: 401, message: 'Sesión expirada.' }; }
      return res.text().then(function (t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) { data = { message: t }; }
        if (!res.ok) throw { status: res.status, message: (data && data.message) || 'Error ' + res.status, errors: data && data.errors };
        return data;
      });
    }, function () { throw { status: 0, message: 'No se pudo conectar con el servidor.' }; });
  }
  function goLogin() {
    var site = state.siteUrl || '';
    window.location.href = site + '/login?next=' + encodeURIComponent('/SAW/');
  }

  /* ---------- Toasts / modals ---------- */
  function toast(msg, type) {
    var el = document.createElement('div');
    el.className = 'saw-toast' + (type ? ' saw-toast--' + type : '');
    el.textContent = msg;
    $('#saw-toasts').appendChild(el);
    setTimeout(function () { el.remove(); }, type === 'error' ? 7000 : 3500);
  }
  var errorToast = function (err) { toast(err && err.message ? err.message : 'Ocurrió un error.', 'error'); };

  function openModal(html, small) {
    var host = $('#saw-modal');
    host.innerHTML = '<div class="saw-modal__box' + (small ? ' saw-modal__box--sm' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    host.hidden = false;
    var prevFocus = document.activeElement;
    var box = host.firstElementChild;
    var close = function () { host.hidden = true; host.innerHTML = ''; document.removeEventListener('keydown', onKey); if (prevFocus) prevFocus.focus(); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    host.onclick = function (e) { if (e.target === host) close(); };
    $$('[data-close]', box).forEach(function (b) { b.addEventListener('click', close); });
    var first = box.querySelector('input, select, textarea, button:not([data-close])');
    if (first) first.focus();
    return { box: box, close: close };
  }

  function confirmDialog(title, message, okText, danger) {
    return new Promise(function (resolve) {
      var m = openModal(
        '<div class="saw-modal__head"><h2>' + esc(title) + '</h2></div>' +
        '<div class="saw-modal__body"><p>' + message + '</p></div>' +
        '<div class="saw-modal__foot"><button class="saw-btn saw-btn--ghost" type="button" data-close>Cancelar</button>' +
        '<button class="saw-btn' + (danger ? ' saw-btn--danger' : '') + '" type="button" data-ok>' + esc(okText || 'Aceptar') + '</button></div>', true);
      var done = false;
      $('[data-ok]', m.box).addEventListener('click', function () { done = true; m.close(); resolve(true); });
      var host = $('#saw-modal');
      var obs = new MutationObserver(function () { if (host.hidden) { obs.disconnect(); if (!done) resolve(false); } });
      obs.observe(host, { attributes: true, attributeFilter: ['hidden'] });
    });
  }

  /* ======================================================================
     Shell: navigation, header, router
     ====================================================================== */
  function buildNav() {
    var repoLink = '<a href="#/repository" data-route="repository"><span class="saw-nav__icon">⇪</span>Repositorio de archivos</a>';
    // Uploader role: only the file repository
    if (!state.features.content) {
      $('#saw-nav').innerHTML = '<div class="saw-nav__group">Archivos</div>' + repoLink;
      return;
    }
    var groups = {};
    state.schema.forEach(function (r) { (groups[r.group] = groups[r.group] || []).push(r); });
    var link = function (r) {
      return '<a href="#/r/' + r.key + '" data-route="r/' + r.key + '"><span class="saw-nav__icon">' + (ICONS[r.icon] || '•') + '</span>' + esc(r.label) + '</a>';
    };
    // "Sitio web" = texts + media + the website resources; then the other groups
    var html = '<a href="#/" data-route="dashboard"><span class="saw-nav__icon">⌂</span>Inicio</a>' +
      '<div class="saw-nav__group">Sitio web</div>' +
      '<a href="#/texts" data-route="texts"><span class="saw-nav__icon">Aa</span>Textos del sitio</a>' +
      '<a href="#/media" data-route="media"><span class="saw-nav__icon">▣</span>Biblioteca de medios</a>' +
      (groups['Sitio web'] || []).map(link).join('');
    Object.keys(groups).filter(function (g) { return g !== 'Sitio web'; }).forEach(function (g) {
      html += '<div class="saw-nav__group">' + esc(g) + '</div>' + groups[g].map(link).join('');
      if (g === 'Formularios' && state.features.repository) html += '<div class="saw-nav__group">Archivos</div>' + repoLink;
    });
    $('#saw-nav').innerHTML = html;
  }

  function setActiveNav(route) {
    $$('#saw-nav a').forEach(function (a) {
      var r = a.getAttribute('data-route');
      a.classList.toggle('is-active', r === route || (route.indexOf(r + '/') === 0 && r !== 'dashboard'));
    });
  }
  function setTitle(t) { $('#saw-title').textContent = t; document.title = t + ' · SAW | Actuarial Factor'; }
  var view = function () { return $('#saw-view'); };

  function route() {
    var hash = (location.hash || '#/').slice(2);
    var parts = hash.split('?')[0].split('/').filter(Boolean);
    $('#saw-side').classList.remove('is-open');
    $('#saw-menu').setAttribute('aria-expanded', 'false');
    state.dirty = false;
    view().innerHTML = '<div class="saw-loading">Cargando…</div>';
    window.scrollTo(0, 0);

    if (parts[0] === 'repository' && state.features.repository) { setActiveNav('repository'); return repositoryView(); }
    // Roles without website content only have the repository
    if (!state.features.content) { location.replace('#/repository'); return; }
    if (!parts.length) { setActiveNav('dashboard'); return dashboardView(); }
    if (parts[0] === 'texts') { setActiveNav('texts'); return textsView(); }
    if (parts[0] === 'media') { setActiveNav('media'); return mediaView(); }
    if (parts[0] === 'r' && state.byKey[parts[1]]) {
      setActiveNav('r/' + parts[1]);
      if (parts[2]) return formView(state.byKey[parts[1]], parts[2] === 'new' ? null : parts[2]);
      return listView(state.byKey[parts[1]]);
    }
    setTitle('No encontrado');
    view().innerHTML = '<div class="saw-card saw-empty">Esta sección no existe o no tiene permiso para verla. <a href="#/">Volver al inicio</a></div>';
  }

  // Warn before leaving a form with unsaved changes
  var lastHash = location.hash;
  window.addEventListener('hashchange', function () {
    if (state.dirty && !window.confirm('Hay cambios sin guardar. ¿Salir de todos modos?')) {
      history.replaceState(null, '', lastHash);
      return;
    }
    lastHash = location.hash;
    route();
  });
  window.addEventListener('beforeunload', function (e) { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ======================================================================
     Dashboard
     ====================================================================== */
  function dashboardView() {
    setTitle('Inicio');
    api('GET', '/admin/dashboard').then(function (res) {
      var d = res.data;
      var kpi = function (value, text, href, alert) {
        return '<a class="saw-card saw-kpi' + (alert ? ' saw-kpi--alert' : '') + '" href="' + href + '"><div class="saw-kpi__value">' + value + '</div><div class="saw-kpi__label">' + text + '</div></a>';
      };
      var has = function (k) { return !!state.byKey[k]; };
      view().innerHTML =
        '<p class="saw-welcome">Hola, <strong>' + esc(state.me.name) + '</strong>. Este es el resumen del sitio.</p>' +
        '<div class="saw-kpis">' +
          (has('contact_requests') ? kpi(d.contactsNew, 'Contactos nuevos (' + d.contactsTotal + ' en total)', '#/r/contact_requests', d.contactsNew > 0) : '') +
          (has('newsletter_subscribers') ? kpi(d.subscribers, 'Suscriptores activos', '#/r/newsletter_subscribers') : '') +
          kpi(d.postsPublished, 'Publicaciones (' + d.postsDraft + ' borradores)', '#/r/posts') +
          kpi(d.mediaCount, 'Archivos en biblioteca', '#/media') +
          kpi(d.team, 'Integrantes del equipo', '#/r/team_members') +
        '</div>' +
        '<div class="saw-grid-2">' +
          '<section class="saw-card"><h2>Últimos contactos</h2>' + (d.recentContacts.length ? '<ul class="saw-list-plain">' + d.recentContacts.map(function (c) {
            return '<li><a href="#/r/contact_requests/' + c.id + '">' + esc(c.name) + ' <span class="saw-muted">· ' + esc(c.company) + '</span></a><span>' + badge(c.status) + ' <span class="saw-muted">' + formatDate(c.created_at, false) + '</span></span></li>';
          }).join('') + '</ul>' : '<p class="saw-muted">Aún no hay contactos.</p>') + '</section>' +
          '<section class="saw-card"><h2>Suscriptores recientes</h2>' + (d.recentSubscribers.length ? '<ul class="saw-list-plain">' + d.recentSubscribers.map(function (s) {
            return '<li><span>' + esc(s.email) + '</span><span class="saw-muted">' + esc(label(s.lang)) + ' · ' + formatDate(s.created_at, false) + '</span></li>';
          }).join('') + '</ul>' : '<p class="saw-muted">Aún no hay suscriptores.</p>') + '</section>' +
        '</div>';
    }).catch(function (err) { view().innerHTML = '<div class="saw-card saw-empty">' + esc(err.message) + '</div>'; });
  }

  /* ======================================================================
     Generic list
     ====================================================================== */
  function loadOptions(resKey) {
    if (state.options[resKey]) return Promise.resolve(state.options[resKey]);
    return api('GET', '/admin/options/' + resKey).then(function (res) {
      state.options[resKey] = res.data;
      return res.data;
    }).catch(function () { return []; });
  }
  function refLabel(field, value) {
    var opts = state.options[field.ref.resource] || [];
    var o = opts.find(function (x) { return String(x.value) === String(value); });
    return o ? o.label : (value == null ? '' : '#' + value);
  }

  function cell(field, value) {
    if (value === null || value === undefined || value === '') return '<span class="saw-muted">—</span>';
    if (field.type === 'media') return isImage(value) ? '<img class="saw-thumb" src="' + esc(mediaUrl(value)) + '" alt="" loading="lazy">' : esc(value);
    if (field.type === 'bool') return Number(value) ? badge('active') : badge('disabled');
    if (field.type === 'enum' || field.values) return badge(value);
    if (field.type === 'ref') return esc(refLabel(field, value));
    if (field.type === 'datetime' || isIsoDate(value)) return esc(formatDate(value));
    return esc(String(value).replace(/<[^>]+>/g, ' ').slice(0, 140));
  }

  function listView(res) {
    setTitle(res.label);
    var st = state.list[res.key] = state.list[res.key] || { page: 1, q: '', sort: '', dir: 'desc', filter: {} };
    var listFields = res.fields.filter(function (f) { return f.list; });
    var refFields = res.fields.filter(function (f) { return f.type === 'ref'; });

    function filterControl(name) {
      var f = res.fields.find(function (x) { return x.name === name; });
      var opts = f.type === 'ref'
        ? (state.options[f.ref.resource] || []).map(function (o) { return [o.value, o.label]; })
        : (f.values || []).map(function (v) { return [v, label(v)]; });
      return '<select class="saw-select saw-select--auto" data-filter="' + name + '" aria-label="Filtrar por ' + esc(f.label) + '">' +
        '<option value="">' + esc(f.label) + ': todos</option>' +
        opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(st.filter[name] || '') === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') +
        '</select>';
    }

    Promise.all(refFields.map(function (f) { return loadOptions(f.ref.resource); })).then(function () {
      view().innerHTML =
        '<div class="saw-toolbar">' +
          (res.searchable ? '<input class="saw-input saw-toolbar__grow" type="search" placeholder="Buscar…" value="' + esc(st.q) + '" data-search aria-label="Buscar">' : '<span class="saw-toolbar__grow"></span>') +
          res.filters.map(filterControl).join('') +
          (res.exportCsv ? '<button class="saw-btn saw-btn--ghost" type="button" data-export>Exportar CSV</button>' : '') +
          (res.readOnly || res.noCreate ? '' : '<a class="saw-btn saw-btn--gold" href="#/r/' + res.key + '/new">+ Agregar ' + esc(res.singular) + '</a>') +
        '</div>' +
        '<div class="saw-table-wrap"><table class="saw-table"><thead><tr>' +
          listFields.map(function (f) {
            var sorted = st.sort === f.name ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none';
            return '<th><button type="button" data-sort="' + f.name + '" aria-sort="' + sorted + '">' + esc(f.label) + '</button></th>';
          }).join('') +
        '</tr></thead><tbody data-rows><tr><td colspan="' + listFields.length + '" class="saw-loading">Cargando…</td></tr></tbody></table></div>' +
        '<div class="saw-pager" data-pager></div>';

      var timer;
      var search = $('[data-search]', view());
      if (search) search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { st.q = search.value; st.page = 1; load(); }, 300);
      });
      $$('[data-filter]', view()).forEach(function (s) {
        s.addEventListener('change', function () { st.filter[s.getAttribute('data-filter')] = s.value; st.page = 1; load(); });
      });
      $$('[data-sort]', view()).forEach(function (b) {
        b.addEventListener('click', function () {
          var name = b.getAttribute('data-sort');
          st.dir = st.sort === name && st.dir === 'desc' ? 'asc' : 'desc';
          st.sort = name;
          $$('[data-sort]', view()).forEach(function (x) { x.setAttribute('aria-sort', x === b ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none'); });
          load();
        });
      });
      var exp = $('[data-export]', view());
      if (exp) exp.addEventListener('click', function () { window.location.href = API + '/admin/r/' + res.key + '/export.csv?' + query(); });
      load();
    });

    function query() {
      var p = new URLSearchParams();
      p.set('page', st.page);
      if (st.q) p.set('q', st.q);
      if (st.sort) { p.set('sort', st.sort); p.set('dir', st.dir); }
      Object.keys(st.filter).forEach(function (k) { if (st.filter[k]) p.set('filter[' + k + ']', st.filter[k]); });
      return p.toString();
    }

    function load() {
      api('GET', '/admin/r/' + res.key + '?' + query()).then(function (out) {
        var tbody = $('[data-rows]', view());
        if (!tbody) return;
        tbody.innerHTML = out.data.length ? out.data.map(function (row) {
          return '<tr data-id="' + row.id + '" tabindex="0">' + listFields.map(function (f) { return '<td>' + cell(f, row[f.name]) + '</td>'; }).join('') + '</tr>';
        }).join('') : '<tr><td colspan="' + listFields.length + '" class="saw-empty">No hay registros' + (st.q || Object.values(st.filter).some(Boolean) ? ' con estos filtros' : '') + '.</td></tr>';
        $$('tr[data-id]', tbody).forEach(function (tr) {
          var open = function () { location.hash = '#/r/' + res.key + '/' + tr.getAttribute('data-id'); };
          tr.addEventListener('click', open);
          tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
        });
        var m = out.meta;
        $('[data-pager]', view()).innerHTML = m.total + ' registro' + (m.total === 1 ? '' : 's') +
          (m.pages > 1 ? ' · página ' + m.page + ' de ' + m.pages +
            ' <button class="saw-btn saw-btn--ghost saw-btn--sm" type="button" data-page="' + (m.page - 1) + '"' + (m.page <= 1 ? ' disabled' : '') + '>‹ Anterior</button>' +
            '<button class="saw-btn saw-btn--ghost saw-btn--sm" type="button" data-page="' + (m.page + 1) + '"' + (m.page >= m.pages ? ' disabled' : '') + '>Siguiente ›</button>' : '');
        $$('[data-page]', view()).forEach(function (b) { b.addEventListener('click', function () { st.page = Number(b.getAttribute('data-page')); load(); }); });
      }).catch(errorToast);
    }
  }

  /* ======================================================================
     Generic form
     ====================================================================== */
  function fieldControl(f, value, isNew) {
    var id = 'f-' + f.name;
    var v = value == null ? '' : value;
    var max = f.max ? ' maxlength="' + f.max + '"' : '';
    var req = f.required ? ' required' : '';
    var readonly = f.type === 'readonly' || (f.createOnly && !isNew);
    if (readonly) {
      var shown = f.values ? label(v) : isIsoDate(v) ? formatDate(v) : v;
      return '<div class="saw-readonly" id="' + id + '">' + (shown === '' ? '<span class="saw-muted">—</span>' : esc(shown)) + '</div>';
    }
    switch (f.type) {
      case 'textarea': return '<textarea class="saw-textarea" id="' + id + '" name="' + f.name + '"' + max + req + '>' + esc(v) + '</textarea>';
      case 'html': return '<div data-editor="' + f.name + '"></div>';
      case 'int': return '<input class="saw-input" type="number" step="1" id="' + id + '" name="' + f.name + '" value="' + esc(v) + '"' + req + '>';
      case 'decimal': return '<input class="saw-input" type="number" step="0.1"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + ' id="' + id + '" name="' + f.name + '" value="' + esc(v) + '"' + req + '>';
      case 'bool': return '<label class="saw-switch"><input type="checkbox" id="' + id + '" name="' + f.name + '"' + (Number(v) || (isNew && v === '') ? ' checked' : '') + '> <span>Sí</span></label>';
      case 'enum':
        return '<select class="saw-select" id="' + id + '" name="' + f.name + '"' + req + '>' + (f.required ? '' : '<option value="">—</option>') +
          f.values.map(function (o) { return '<option value="' + esc(o) + '"' + (String(v) === o ? ' selected' : '') + '>' + esc(label(o)) + '</option>'; }).join('') + '</select>';
      case 'ref':
        return '<select class="saw-select" id="' + id + '" name="' + f.name + '"><option value="">— Ninguno —</option>' +
          (state.options[f.ref.resource] || []).map(function (o) { return '<option value="' + o.value + '"' + (String(v) === String(o.value) ? ' selected' : '') + '>' + esc(o.label) + '</option>'; }).join('') + '</select>';
      case 'date': return '<input class="saw-input" type="date" id="' + id + '" name="' + f.name + '" value="' + esc(v ? String(v).slice(0, 10) : '') + '"' + req + '>';
      case 'datetime': return '<input class="saw-input" type="datetime-local" id="' + id + '" name="' + f.name + '" value="' + esc(v ? toLocalInput(v) : '') + '"' + req + '>';
      case 'media':
        return '<div class="saw-mediafield" data-media="' + f.name + '"><input type="hidden" name="' + f.name + '" value="' + esc(v) + '">' +
          '<div class="saw-mediafield__preview" data-preview></div><span class="saw-mediafield__path" data-path></span>' +
          '<button class="saw-btn saw-btn--ghost saw-btn--sm" type="button" data-pick>Elegir de la biblioteca</button>' +
          '<button class="saw-btn saw-btn--danger saw-btn--sm" type="button" data-clear>Quitar</button></div>';
      case 'password': return '<input class="saw-input" type="password" autocomplete="new-password" id="' + id + '" name="' + f.name + '"' + max + (isNew ? ' required' : '') + ' placeholder="' + (isNew ? 'Mínimo ' + (f.min || 8) + ' caracteres' : 'Dejar vacío para no cambiarla') + '">';
      case 'email': return '<input class="saw-input" type="email" id="' + id + '" name="' + f.name + '" value="' + esc(v) + '"' + max + req + '>';
      case 'url': return '<input class="saw-input" type="url" id="' + id + '" name="' + f.name + '" value="' + esc(v) + '"' + max + req + ' placeholder="https://">';
      default: return '<input class="saw-input" type="text" id="' + id + '" name="' + f.name + '" value="' + esc(v) + '"' + max + req + '>';
    }
  }

  function formView(res, id) {
    var isNew = !id;
    if (isNew && (res.readOnly || res.noCreate)) { location.hash = '#/r/' + res.key; return; }
    setTitle((isNew ? 'Agregar ' : 'Editar ') + res.singular);
    var refFields = res.fields.filter(function (f) { return f.type === 'ref'; });
    var editors = {};

    Promise.all([isNew ? Promise.resolve({ data: {} }) : api('GET', '/admin/r/' + res.key + '/' + id)]
      .concat(refFields.map(function (f) { return loadOptions(f.ref.resource); })))
      .then(function (out) {
        var row = out[0].data;
        var canEdit = !res.readOnly;
        view().innerHTML =
          '<a class="saw-back" href="#/r/' + res.key + '">‹ ' + esc(res.label) + '</a>' +
          '<form class="saw-card" novalidate data-form><div class="saw-form">' +
            res.fields.map(function (f) {
              return '<div class="saw-field' + (f.half ? ' saw-field--half' : '') + '" data-field="' + f.name + '">' +
                (f.type === 'html' || f.type === 'media' || f.type === 'readonly'
                  ? '<span class="saw-field__label">' + esc(f.label) + '</span>'
                  : '<label for="f-' + f.name + '">' + esc(f.label) + (f.required ? ' <span class="saw-field__req">*</span>' : '') + '</label>') +
                fieldControl(f, row[f.name], isNew) +
                (f.type === 'slug' ? '<span class="saw-field__help">Se usa en la URL. Solo minúsculas, números y guiones.</span>' : '') +
                '<span class="saw-field__error" data-error></span></div>';
            }).join('') +
          '</div></form>' +
          '<div class="saw-form-actions">' +
            (canEdit ? '<button class="saw-btn saw-btn--gold" type="button" data-save>Guardar</button>' : '') +
            '<a class="saw-btn saw-btn--ghost" href="#/r/' + res.key + '">Volver</a>' +
            '<span class="saw-form-actions__spacer"></span>' +
            (!isNew && canEdit ? '<button class="saw-btn saw-btn--danger" type="button" data-delete>Eliminar</button>' : '') +
            (res.key === 'posts' && !isNew && row.status === 'published' ? '<a class="saw-btn saw-btn--ghost" target="_blank" rel="noopener" href="' + esc(state.siteUrl + '/post?slug=' + encodeURIComponent(row.slug)) + '">Ver en el sitio ↗</a>' : '') +
          '</div>';

        var form = $('[data-form]', view());
        // Rich text editors
        $$('[data-editor]', form).forEach(function (host) {
          var name = host.getAttribute('data-editor');
          editors[name] = createEditor(host, row[name] || '');
        });
        // Media fields
        $$('[data-media]', form).forEach(function (box) {
          var input = $('input', box);
          var paint = function () {
            var p = input.value;
            $('[data-preview]', box).innerHTML = p ? (isImage(p) ? '<img src="' + esc(mediaUrl(p)) + '" alt="">' : 'Archivo') : 'Sin archivo';
            $('[data-path]', box).textContent = p || '';
            $('[data-clear]', box).hidden = !p;
          };
          paint();
          $('[data-pick]', box).addEventListener('click', function () {
            openMediaPicker().then(function (item) { if (item) { input.value = item.path; paint(); state.dirty = true; } });
          });
          $('[data-clear]', box).addEventListener('click', function () { input.value = ''; paint(); state.dirty = true; });
        });
        // Slug follows its source field until edited by hand
        res.fields.filter(function (f) { return f.type === 'slug' && f.from; }).forEach(function (f) {
          var slug = form.elements[f.name];
          var src = form.elements[f.from];
          if (!slug || !src) return;
          var manual = !isNew && !!slug.value;
          slug.addEventListener('input', function () { manual = true; });
          src.addEventListener('input', function () { if (!manual) slug.value = slugify(src.value); });
        });
        form.addEventListener('input', function () { state.dirty = true; });
        form.addEventListener('change', function () { state.dirty = true; });

        var saveBtn = $('[data-save]', view());
        if (saveBtn) saveBtn.addEventListener('click', function () { save(form, saveBtn); });
        form.addEventListener('keydown', function (e) {
          if ((e.ctrlKey || e.metaKey) && e.key === 's' && saveBtn) { e.preventDefault(); save(form, saveBtn); }
        });
        var del = $('[data-delete]', view());
        if (del) del.addEventListener('click', function () {
          confirmDialog('Eliminar ' + res.singular, '¿Seguro que desea eliminar este registro? Esta acción no se puede deshacer.', 'Eliminar', true).then(function (ok) {
            if (!ok) return;
            api('DELETE', '/admin/r/' + res.key + '/' + id).then(function () {
              state.dirty = false;
              delete state.options[res.key];
              toast('Registro eliminado.', 'ok');
              location.hash = '#/r/' + res.key;
            }).catch(errorToast);
          });
        });
      }).catch(function (err) { view().innerHTML = '<div class="saw-card saw-empty">' + esc(err.message) + ' <a href="#/r/' + res.key + '">Volver</a></div>'; });

    function collect(form) {
      var data = {};
      res.fields.forEach(function (f) {
        if (f.type === 'readonly' || (f.createOnly && !isNew)) return;
        if (f.type === 'html') { data[f.name] = editors[f.name].getValue(); return; }
        var el = form.elements[f.name];
        if (!el) return;
        if (f.type === 'bool') data[f.name] = el.checked;
        else if (f.type === 'datetime') data[f.name] = el.value ? new Date(el.value).toISOString() : '';
        else if (f.type === 'password') { if (el.value) data[f.name] = el.value; }
        else data[f.name] = el.value;
      });
      return data;
    }

    function save(form, btn) {
      $$('.saw-field', form).forEach(function (fl) { fl.classList.remove('is-invalid'); $('[data-error]', fl).textContent = ''; });
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      var req = isNew ? api('POST', '/admin/r/' + res.key, collect(form)) : api('PUT', '/admin/r/' + res.key + '/' + id, collect(form));
      req.then(function (out) {
        state.dirty = false;
        delete state.options[res.key];
        toast('Cambios guardados.', 'ok');
        if (isNew) location.hash = '#/r/' + res.key + '/' + out.data.id;
        else route();
      }).catch(function (err) {
        (err.errors || []).forEach(function (e) {
          var fl = $('[data-field="' + e.field + '"]', form);
          if (fl) { fl.classList.add('is-invalid'); $('[data-error]', fl).textContent = e.message; }
        });
        var firstBad = $('.is-invalid input, .is-invalid select, .is-invalid textarea, .is-invalid [contenteditable]', form);
        if (firstBad) firstBad.focus();
        errorToast(err);
      }).finally(function () { btn.disabled = false; btn.textContent = 'Guardar'; });
    }
  }

  /* ---------- Rich text editor (contenteditable, sanitized again by the API) ---------- */
  function createEditor(host, html) {
    host.className = 'saw-editor';
    host.innerHTML =
      '<div class="saw-editor__bar" role="toolbar" aria-label="Formato">' +
        '<button type="button" data-cmd="bold" title="Negrita"><b>B</b></button>' +
        '<button type="button" data-cmd="italic" title="Cursiva"><i>I</i></button>' +
        '<button type="button" data-block="h2" title="Título">H2</button>' +
        '<button type="button" data-block="h3" title="Subtítulo">H3</button>' +
        '<button type="button" data-block="p" title="Párrafo">¶</button>' +
        '<button type="button" data-cmd="insertUnorderedList" title="Lista">• Lista</button>' +
        '<button type="button" data-cmd="insertOrderedList" title="Lista numerada">1. Lista</button>' +
        '<button type="button" data-link title="Enlace">Enlace</button>' +
        '<button type="button" data-cmd="unlink" title="Quitar enlace">Quitar enlace</button>' +
        '<button type="button" data-image title="Imagen de la biblioteca">Imagen</button>' +
        '<button type="button" data-source aria-pressed="false" title="Ver HTML">&lt;/&gt;</button>' +
      '</div>' +
      '<div class="saw-editor__area" contenteditable="true" role="textbox" aria-multiline="true"></div>' +
      '<textarea class="saw-editor__source" hidden spellcheck="false" aria-label="Código HTML"></textarea>';
    var area = $('.saw-editor__area', host);
    var source = $('.saw-editor__source', host);
    area.innerHTML = html;
    var exec = function (cmd, val) { area.focus(); document.execCommand(cmd, false, val); state.dirty = true; };

    $$('[data-cmd]', host).forEach(function (b) { b.addEventListener('click', function () { exec(b.getAttribute('data-cmd')); }); });
    $$('[data-block]', host).forEach(function (b) { b.addEventListener('click', function () { exec('formatBlock', '<' + b.getAttribute('data-block') + '>'); }); });
    $('[data-link]', host).addEventListener('click', function () {
      var sel = window.getSelection();
      var range = sel.rangeCount ? sel.getRangeAt(0) : null;
      var url = window.prompt('URL del enlace (https://…, mailto:…)');
      if (!url) return;
      if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(url)) { toast('El enlace debe iniciar con https://, mailto:, tel: o /', 'error'); return; }
      if (range) { sel.removeAllRanges(); sel.addRange(range); }
      exec('createLink', url);
    });
    $('[data-image]', host).addEventListener('click', function () {
      var sel = window.getSelection();
      var range = sel.rangeCount && area.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
      openMediaPicker('image').then(function (item) {
        if (!item) return;
        area.focus();
        if (range) { sel.removeAllRanges(); sel.addRange(range); }
        exec('insertHTML', '<img src="' + esc(mediaUrl(item.path)) + '" alt="' + esc(item.alt_es || item.alt_en || '') + '">');
      });
    });
    var srcBtn = $('[data-source]', host);
    srcBtn.addEventListener('click', function () {
      var showing = !source.hidden;
      if (showing) area.innerHTML = source.value; else source.value = area.innerHTML;
      source.hidden = showing; area.hidden = !showing;
      srcBtn.setAttribute('aria-pressed', String(!showing));
    });
    // Paste as plain text (avoids Word/Docs styles)
    area.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    area.addEventListener('input', function () { state.dirty = true; });
    return { getValue: function () { return source.hidden ? area.innerHTML : source.value; } };
  }

  /* ======================================================================
     Media library
     ====================================================================== */
  function uploadFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return Promise.resolve([]);
    var tooBig = list.filter(function (f) { return f.size > state.uploadMaxMb * 1048576; });
    if (tooBig.length) { toast('Archivo demasiado grande (máx. ' + state.uploadMaxMb + ' MB): ' + tooBig.map(function (f) { return f.name; }).join(', '), 'error'); }
    list = list.filter(function (f) { return f.size <= state.uploadMaxMb * 1048576; });
    if (!list.length) return Promise.resolve([]);
    var fd = new FormData();
    list.forEach(function (f) { fd.append('files', f); });
    toast('Subiendo ' + list.length + ' archivo' + (list.length > 1 ? 's' : '') + '…');
    return api('POST', '/admin/media', fd).then(function (out) {
      if (out.saved.length) toast(out.saved.length + ' archivo(s) subido(s).', 'ok');
      (out.rejected || []).forEach(function (r) { toast(r.name + ': ' + r.message, 'error'); });
      return out.saved;
    }).catch(function (err) { errorToast(err); return []; });
  }

  function mediaCard(m, selected) {
    var thumb = isImage(m.path, m.mime_type)
      ? '<img class="saw-media-item__img" src="' + esc(mediaUrl(m.path)) + '" alt="' + esc(m.alt_es || m.alt_en || '') + '" loading="lazy">'
      : '<span class="saw-media-item__img">' + (m.mime_type === 'application/pdf' ? 'PDF' : 'VIDEO') + '</span>';
    return '<button type="button" class="saw-media-item' + (selected ? ' is-selected' : '') + '" data-media-id="' + m.id + '">' + thumb +
      '<span class="saw-media-item__meta"><span class="saw-media-item__name">' + esc(m.original_name) + '</span><span class="saw-media-item__size">' + formatSize(m.size_bytes) + '</span></span></button>';
  }

  /** Reusable library browser (full page or inside the picker modal) */
  function mediaBrowser(host, opts) {
    var st = { q: '', type: opts.type || '', page: 1, items: [] };
    host.innerHTML =
      '<label class="saw-drop" data-drop><input type="file" multiple hidden data-file accept="' + state.mediaTypes.join(',') + '">' +
        '<strong>Arrastre archivos aquí</strong> o haga clic para elegirlos<br><span class="saw-muted">JPG, PNG, WebP, GIF, PDF o MP4 · máximo ' + state.uploadMaxMb + ' MB por archivo</span></label>' +
      '<div class="saw-toolbar"><input class="saw-input saw-toolbar__grow" type="search" placeholder="Buscar por nombre o texto alternativo…" data-q aria-label="Buscar archivos">' +
        '<select class="saw-select saw-select--auto" data-type aria-label="Tipo de archivo"><option value="">Todos los tipos</option><option value="image">Imágenes</option><option value="document">PDF</option><option value="video">Video</option></select></div>' +
      '<div class="saw-media-grid" data-grid></div><div class="saw-pager" data-pager></div>';
    $('[data-type]', host).value = st.type;
    var drop = $('[data-drop]', host);
    var fileInput = $('[data-file]', host);
    fileInput.addEventListener('change', function () { uploadFiles(fileInput.files).then(function () { fileInput.value = ''; st.page = 1; load(); }); });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { uploadFiles(e.dataTransfer.files).then(function () { st.page = 1; load(); }); });
    var t;
    $('[data-q]', host).addEventListener('input', function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value; st.page = 1; load(); }, 300); });
    $('[data-type]', host).addEventListener('change', function (e) { st.type = e.target.value; st.page = 1; load(); });

    function load() {
      var p = new URLSearchParams({ page: st.page, limit: opts.limit || 40 });
      if (st.q) p.set('q', st.q);
      if (st.type) p.set('type', st.type);
      api('GET', '/admin/media?' + p).then(function (out) {
        st.items = out.data;
        var grid = $('[data-grid]', host);
        grid.innerHTML = out.data.length ? out.data.map(function (m) { return mediaCard(m); }).join('') : '<p class="saw-muted">No hay archivos.</p>';
        $$('[data-media-id]', grid).forEach(function (b) {
          b.addEventListener('click', function () {
            var item = st.items.find(function (m) { return String(m.id) === b.getAttribute('data-media-id'); });
            opts.onSelect(item, load);
          });
        });
        var m = out.meta;
        $('[data-pager]', host).innerHTML = m.total + ' archivo' + (m.total === 1 ? '' : 's') + (m.pages > 1
          ? ' <button class="saw-btn saw-btn--ghost saw-btn--sm" type="button" data-p="' + (m.page - 1) + '"' + (m.page <= 1 ? ' disabled' : '') + '>‹</button> ' + m.page + ' / ' + m.pages +
            ' <button class="saw-btn saw-btn--ghost saw-btn--sm" type="button" data-p="' + (m.page + 1) + '"' + (m.page >= m.pages ? ' disabled' : '') + '>›</button>' : '');
        $$('[data-p]', host).forEach(function (b) { b.addEventListener('click', function () { st.page = Number(b.getAttribute('data-p')); load(); }); });
      }).catch(errorToast);
    }
    load();
    return { reload: load };
  }

  function mediaView() {
    setTitle('Biblioteca de medios');
    view().innerHTML = '<div data-browser></div>';
    mediaBrowser($('[data-browser]', view()), { onSelect: function (item, reload) { mediaDetail(item, reload); } });
  }

  function mediaDetail(m, reload) {
    var url = mediaUrl(m.path);
    var abs = state.siteUrl + url;
    var preview = isImage(m.path, m.mime_type) ? '<img src="' + esc(url) + '" alt="">' : /^video\//.test(m.mime_type) ? '<video src="' + esc(url) + '" controls muted></video>' : '<a class="saw-btn" href="' + esc(url) + '" target="_blank" rel="noopener">Abrir PDF ↗</a>';
    var modal = openModal(
      '<div class="saw-modal__head"><h2>' + esc(m.original_name) + '</h2><button class="saw-icon-btn" type="button" data-close aria-label="Cerrar">✕</button></div>' +
      '<div class="saw-modal__body"><div class="saw-media-detail"><div class="saw-media-detail__preview">' + preview + '</div><div>' +
        '<dl><dt>Tipo</dt><dd>' + esc(m.mime_type) + '</dd><dt>Tamaño</dt><dd>' + formatSize(m.size_bytes) + '</dd><dt>Subido</dt><dd>' + formatDate(m.created_at) + '</dd><dt>Ruta</dt><dd><code>' + esc(m.path) + '</code></dd></dl>' +
        '<div class="saw-form"><div class="saw-field"><label for="alt-en">Texto alternativo (EN)</label><input class="saw-input" id="alt-en" maxlength="255" value="' + esc(m.alt_en || '') + '"></div>' +
        '<div class="saw-field"><label for="alt-es">Texto alternativo (ES)</label><input class="saw-input" id="alt-es" maxlength="255" value="' + esc(m.alt_es || '') + '"></div></div>' +
      '</div></div></div>' +
      '<div class="saw-modal__foot"><button class="saw-btn saw-btn--danger" type="button" data-del>Eliminar</button><span class="saw-form-actions__spacer"></span>' +
        '<button class="saw-btn saw-btn--ghost" type="button" data-copy>Copiar URL</button><button class="saw-btn saw-btn--gold" type="button" data-save>Guardar</button></div>');
    $('[data-copy]', modal.box).addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(abs) : Promise.reject()).then(function () { toast('URL copiada.', 'ok'); }, function () { window.prompt('Copie la URL:', abs); });
    });
    $('[data-save]', modal.box).addEventListener('click', function () {
      api('PUT', '/admin/media/' + m.id, { alt_en: $('#alt-en').value, alt_es: $('#alt-es').value })
        .then(function () { toast('Archivo actualizado.', 'ok'); modal.close(); reload(); }).catch(errorToast);
    });
    $('[data-del]', modal.box).addEventListener('click', function () {
      var remove = function (force) {
        return api('DELETE', '/admin/media/' + m.id + (force ? '?force=1' : '')).then(function () { toast('Archivo eliminado.', 'ok'); modal.close(); reload(); });
      };
      remove(false).catch(function (err) {
        if (err.status !== 409) return errorToast(err);
        var where = (err.errors || []).map(function (u) { return esc((state.byKey[u.resource] || {}).label || u.resource) + ': ' + esc(u.label); }).join('<br>');
        modal.close();
        confirmDialog('Archivo en uso', 'Este archivo se usa en:<br>' + where + '<br><br>Si lo elimina, esas imágenes dejarán de verse. ¿Eliminar de todos modos?', 'Eliminar', true)
          .then(function (ok) { if (ok) remove(true).catch(errorToast); });
      });
    });
  }

  /** Modal to choose a file; resolves with the media item or null */
  function openMediaPicker(type) {
    return new Promise(function (resolve) {
      var chosen = null;
      var modal = openModal(
        '<div class="saw-modal__head"><h2>Elegir archivo</h2><button class="saw-icon-btn" type="button" data-close aria-label="Cerrar">✕</button></div>' +
        '<div class="saw-modal__body" data-browser></div>');
      mediaBrowser($('[data-browser]', modal.box), {
        type: type || 'image', limit: 24,
        onSelect: function (item) { chosen = item; modal.close(); }
      });
      var host = $('#saw-modal');
      var obs = new MutationObserver(function () { if (host.hidden) { obs.disconnect(); resolve(chosen); } });
      obs.observe(host, { attributes: true, attributeFilter: ['hidden'] });
    });
  }

  /* ======================================================================
     Website texts (i18n)
     ====================================================================== */
  function textsView() {
    setTitle('Textos del sitio');
    var changes = {};
    var st = { group: 'Textos del sitio', q: '' };
    api('GET', '/admin/texts').then(function (out) {
      var all = out.data;
      var groups = ['Textos del sitio', 'SEO / Meta', 'Mensajes del sistema'];
      view().innerHTML =
        '<p class="saw-welcome">Edite los textos en inglés y español. Los cambios se ven en el sitio al recargar la página. Algunos textos incluyen etiquetas como <code>&lt;span&gt;</code> (segunda línea en negritas de los títulos) o <code>&lt;br&gt;</code>: consérvelas.</p>' +
        '<div class="saw-toolbar"><div class="saw-tabs" role="group" aria-label="Sección">' + groups.map(function (g) {
          return '<button type="button" class="saw-tab" data-group="' + esc(g) + '" aria-pressed="' + (g === st.group) + '">' + esc(g) + '</button>';
        }).join('') + '</div><input class="saw-input saw-toolbar__grow" type="search" placeholder="Buscar texto en inglés o español…" data-q aria-label="Buscar texto"></div>' +
        '<div class="saw-texts" data-rows></div>' +
        '<div class="saw-savebar"><button class="saw-btn saw-btn--gold" type="button" data-save disabled>Guardar cambios</button></div>';

      var rowsEl = $('[data-rows]', view());
      var saveBtn = $('[data-save]', view());
      function refreshSave() {
        var n = Object.keys(changes).length;
        saveBtn.disabled = !n;
        saveBtn.textContent = n ? 'Guardar cambios (' + n + ')' : 'Guardar cambios';
        state.dirty = n > 0;
      }
      function render() {
        var q = st.q.toLowerCase();
        var rows = all.filter(function (t) {
          return (q ? (t.key + ' ' + t.en + ' ' + t.es).toLowerCase().indexOf(q) !== -1 : t.group === st.group);
        }).slice(0, 400);
        rowsEl.innerHTML = rows.length ? rows.map(function (t) {
          var c = changes[t.key] || {};
          return '<div class="saw-text-row' + (changes[t.key] ? ' is-dirty' : '') + '" data-key="' + esc(t.key) + '"><div><code>' + esc(t.key) + '</code></div>' +
            '<div><span class="saw-text-row__lang">EN</span><textarea class="saw-textarea" data-lang="en" aria-label="' + esc(t.key) + ' inglés">' + esc(c.en != null ? c.en : t.en) + '</textarea></div>' +
            '<div><span class="saw-text-row__lang">ES</span><textarea class="saw-textarea" data-lang="es" aria-label="' + esc(t.key) + ' español">' + esc(c.es != null ? c.es : t.es) + '</textarea></div></div>';
        }).join('') : '<div class="saw-card saw-empty">Sin resultados.</div>';
      }
      rowsEl.addEventListener('input', function (e) {
        var ta = e.target.closest('textarea[data-lang]');
        if (!ta) return;
        var row = ta.closest('[data-key]');
        var key = row.getAttribute('data-key');
        var orig = all.find(function (t) { return t.key === key; });
        var en = $('[data-lang="en"]', row).value;
        var es = $('[data-lang="es"]', row).value;
        if (en === orig.en && es === orig.es) delete changes[key];
        else changes[key] = { key: key, en: en, es: es };
        row.classList.toggle('is-dirty', !!changes[key]);
        refreshSave();
      });
      $$('[data-group]', view()).forEach(function (b) {
        b.addEventListener('click', function () {
          st.group = b.getAttribute('data-group'); st.q = ''; $('[data-q]', view()).value = '';
          $$('[data-group]', view()).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          render();
        });
      });
      var t;
      $('[data-q]', view()).addEventListener('input', function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value.trim(); render(); }, 250); });
      saveBtn.addEventListener('click', function () {
        var list = Object.keys(changes).map(function (k) { return changes[k]; });
        saveBtn.disabled = true;
        api('PUT', '/admin/texts', { changes: list }).then(function () {
          list.forEach(function (c) { var o = all.find(function (x) { return x.key === c.key; }); o.en = c.en; o.es = c.es; });
          changes = {};
          refreshSave();
          render();
          toast('Textos guardados. Recargue el sitio para verlos.', 'ok');
        }).catch(function (err) {
          (err.errors || []).forEach(function (e) { toast(e.field + ': ' + e.message, 'error'); });
          errorToast(err);
          refreshSave();
        });
      });
      render();
    }).catch(function (err) { view().innerHTML = '<div class="saw-card saw-empty">' + esc(err.message) + '</div>'; });
  }

  /* ======================================================================
     File repository (OneDrive) — roles admin, editor, uploader
     ====================================================================== */
  var REPO_LANGS = { en: 'Inglés', es: 'Español', other: 'Otro' };

  function fileTypeBadge(f) {
    var ext = (f.file_name.split('.').pop() || '').toLowerCase();
    var kind = /^(pdf)$/.test(ext) ? 'pdf' : /^(docx?)$/.test(ext) ? 'doc' : /^(xlsx?|csv)$/.test(ext) ? 'xls' : /^(pptx?)$/.test(ext) ? 'ppt' : /^(txt)$/.test(ext) ? 'txt' : '';
    return '<span class="saw-filetype' + (kind ? ' saw-filetype--' + kind : '') + '">' + esc(ext.toUpperCase().slice(0, 4)) + '</span>';
  }
  var repoFileUrl = function (f, inline) { return API + '/admin/repository/' + f.id + '/download' + (inline ? '?inline=1' : ''); };

  /** Upload with progress (fetch has no upload progress) */
  function xhrUpload(url, formData, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.withCredentials = true;
      xhr.setRequestHeader('X-Requested-With', 'fetch');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onload = function () {
        var data = null;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = { message: xhr.responseText }; }
        if (xhr.status === 401) { goLogin(); return reject({ status: 401, message: 'Sesión expirada.' }); }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject({ status: xhr.status, message: (data && data.message) || 'Error ' + xhr.status, errors: data && data.errors, data: data });
      };
      xhr.onerror = function () { reject({ status: 0, message: 'No se pudo conectar con el servidor.' }); };
      xhr.send(formData);
    });
  }

  function repositoryView() {
    setTitle('Repositorio de archivos');
    var st = { q: '', category: '', type: '', lang: '', page: 1, sort: 'created_at', dir: 'desc' };
    var info = null;
    var cats = [];
    var picked = [];

    // Result of the OneDrive connection round trip (#/repository?onedrive=...)
    var flag = new URLSearchParams((location.hash.split('?')[1] || '')).get('onedrive');
    if (flag) {
      var msgs = { connected: ['Cuenta de OneDrive conectada.', 'ok'], denied: ['Se canceló la conexión con OneDrive.', 'error'], state: ['La solicitud de conexión expiró. Intente de nuevo.', 'error'], error: ['No se pudo conectar OneDrive. Revise las credenciales de la app.', 'error'] };
      if (msgs[flag]) toast(msgs[flag][0], msgs[flag][1]);
      history.replaceState(null, '', '#/repository');
    }

    view().innerHTML =
      '<section class="saw-card saw-repo-status" data-status><div class="saw-loading">Verificando almacenamiento…</div></section>' +
      '<section class="saw-card saw-repo-upload"><h2>Subir archivos</h2>' +
        '<label class="saw-drop" data-drop><input type="file" multiple hidden data-file>' +
          '<strong>Arrastre imágenes o documentos aquí</strong> o haga clic para elegirlos<br><span class="saw-muted" data-limits></span></label>' +
        '<ul class="saw-repo-files" data-picked></ul>' +
        '<form class="saw-form" data-meta novalidate>' +
          '<div class="saw-field" data-field="title"><label for="r-title">Título</label><input class="saw-input" id="r-title" name="title" maxlength="255" placeholder="Opcional (si sube varios archivos se usa el nombre de cada uno)"><span class="saw-field__error" data-error></span></div>' +
          '<div class="saw-field saw-field--half" data-field="category"><label for="r-category">Categoría (carpeta)</label><input class="saw-input" id="r-category" name="category" maxlength="120" list="r-cats" placeholder="Ej. Reportes 2026"><datalist id="r-cats"></datalist><span class="saw-field__help">Se crea como subcarpeta en el repositorio.</span><span class="saw-field__error" data-error></span></div>' +
          '<div class="saw-field saw-field--half" data-field="lang"><label for="r-lang">Idioma</label><select class="saw-select" id="r-lang" name="lang"><option value="">—</option><option value="es">Español</option><option value="en">Inglés</option><option value="other">Otro</option></select></div>' +
          '<div class="saw-field" data-field="tags"><label for="r-tags">Etiquetas</label><input class="saw-input" id="r-tags" name="tags" maxlength="500" placeholder="Separadas por comas: reservas, cliente X, 2026"><span class="saw-field__error" data-error></span></div>' +
          '<div class="saw-field" data-field="description"><label for="r-desc">Descripción</label><textarea class="saw-textarea" id="r-desc" name="description" maxlength="5000"></textarea><span class="saw-field__error" data-error></span></div>' +
        '</form>' +
        '<div class="saw-progress" data-progress hidden><span></span></div>' +
        '<div class="saw-form-actions"><button class="saw-btn saw-btn--gold" type="button" data-upload disabled>Subir archivos</button><button class="saw-btn saw-btn--ghost" type="button" data-clear-picked hidden>Limpiar selección</button></div>' +
      '</section>' +
      '<div class="saw-toolbar">' +
        '<input class="saw-input saw-toolbar__grow" type="search" placeholder="Buscar por nombre, título, descripción o etiqueta…" data-q aria-label="Buscar archivos">' +
        '<select class="saw-select saw-select--auto" data-cat aria-label="Categoría"><option value="">Categoría: todas</option></select>' +
        '<select class="saw-select saw-select--auto" data-type aria-label="Tipo"><option value="">Tipo: todos</option><option value="image">Imágenes</option><option value="document">Documentos</option></select>' +
        '<select class="saw-select saw-select--auto" data-lang aria-label="Idioma"><option value="">Idioma: todos</option><option value="es">Español</option><option value="en">Inglés</option><option value="other">Otro</option></select>' +
      '</div>' +
      '<div class="saw-table-wrap"><table class="saw-table"><thead><tr>' +
        '<th><button type="button" data-sort="title" aria-sort="none">Archivo</button></th>' +
        '<th><button type="button" data-sort="category" aria-sort="none">Categoría</button></th>' +
        '<th>Idioma</th><th><button type="button" data-sort="size_bytes" aria-sort="none">Tamaño</button></th>' +
        '<th>Subido por</th><th><button type="button" data-sort="created_at" aria-sort="descending">Fecha</button></th><th class="sr-only">Acciones</th>' +
      '</tr></thead><tbody data-rows><tr><td colspan="7" class="saw-loading">Cargando…</td></tr></tbody></table></div>' +
      '<div class="saw-pager" data-pager></div>';

    var root = view();
    var fileInput = $('[data-file]', root);
    var drop = $('[data-drop]', root);
    var uploadBtn = $('[data-upload]', root);

    /* ---- storage status ---- */
    function loadStatus() {
      api('GET', '/admin/repository/status').then(function (res) {
        info = res.data;
        fileInput.setAttribute('accept', info.extensions.join(','));
        $('[data-limits]', root).textContent = info.extensions.map(function (e) { return e.slice(1).toUpperCase(); }).join(', ') + ' · máximo ' + info.maxMb + ' MB por archivo';
        var dot = info.connected ? 'is-ok' : info.configured ? 'is-bad' : '';
        var where = info.driver === 'onedrive' ? 'OneDrive' + (info.rootFolder ? ' · carpeta «' + info.rootFolder + '»' : '') : 'Servidor local';
        var quota = info.quota && info.quota.total ? ' · espacio usado ' + formatSize(info.quota.used) + ' de ' + formatSize(info.quota.total) : '';
        var adminBtns = '';
        if (state.features.repositorySettings && info.driver === 'onedrive') {
          if (info.auth === 'delegated' && info.configured && !info.connected) adminBtns += '<button class="saw-btn saw-btn--gold" type="button" data-connect>Conectar OneDrive</button>';
          if (info.auth === 'delegated' && info.connected) adminBtns += '<button class="saw-btn saw-btn--ghost" type="button" data-disconnect>Desconectar</button>';
          if (info.connected) adminBtns += '<button class="saw-btn saw-btn--ghost" type="button" data-sync>Sincronizar con OneDrive</button>';
        }
        $('[data-status]', root).innerHTML =
          '<div class="saw-repo-status__main"><span class="saw-repo-status__dot ' + dot + '"></span><div><strong>' + esc(where) + '</strong>' +
          (info.account ? ' <span class="saw-muted">(' + esc(info.account) + ')</span>' : '') +
          '<div class="saw-repo-status__meta">' + esc(info.message) + ' · ' + info.files + ' archivo' + (info.files === 1 ? '' : 's') + ' (' + formatSize(info.bytes) + ')' + esc(quota) + '</div></div></div>' + adminBtns;
        bindStatusButtons();
      }).catch(function (err) { $('[data-status]', root).innerHTML = '<span class="saw-repo-status__dot is-bad"></span> ' + esc(err.message); });
    }
    function bindStatusButtons() {
      var c = $('[data-connect]', root);
      if (c) c.addEventListener('click', function () {
        api('POST', '/admin/repository/onedrive/connect').then(function (r) { window.location.href = r.url; }).catch(errorToast);
      });
      var d = $('[data-disconnect]', root);
      if (d) d.addEventListener('click', function () {
        confirmDialog('Desconectar OneDrive', 'Los archivos permanecen en OneDrive, pero no se podrán subir ni descargar hasta volver a conectar la cuenta.', 'Desconectar', true).then(function (ok) {
          if (ok) api('DELETE', '/admin/repository/onedrive/connection').then(function () { toast('OneDrive desconectado.', 'ok'); loadStatus(); }).catch(errorToast);
        });
      });
      var s = $('[data-sync]', root);
      if (s) s.addEventListener('click', function () {
        s.disabled = true; s.textContent = 'Sincronizando…';
        api('POST', '/admin/repository/sync').then(function (r) {
          toast('Sincronizado: ' + r.data.added + ' nuevos, ' + r.data.updated + ' actualizados, ' + r.data.missing + ' no encontrados.', 'ok');
          loadStatus(); loadCats(); load();
        }).catch(errorToast).finally(function () { s.disabled = false; s.textContent = 'Sincronizar con OneDrive'; });
      });
    }

    function loadCats() {
      api('GET', '/admin/repository/categories').then(function (res) {
        cats = res.data;
        $('#r-cats').innerHTML = cats.map(function (c) { return '<option value="' + esc(c.category) + '">'; }).join('');
        $('[data-cat]', root).innerHTML = '<option value="">Categoría: todas</option>' + cats.map(function (c) {
          return '<option value="' + esc(c.category) + '"' + (st.category === c.category ? ' selected' : '') + '>' + esc(c.category) + ' (' + c.n + ')</option>';
        }).join('');
      }).catch(function () {});
    }

    /* ---- picking files ---- */
    function renderPicked() {
      $('[data-picked]', root).innerHTML = picked.map(function (f, i) {
        return '<li><span>' + esc(f.name) + ' <span class="saw-muted">· ' + formatSize(f.size) + '</span></span><button class="saw-btn saw-btn--ghost saw-btn--sm" type="button" data-unpick="' + i + '">Quitar</button></li>';
      }).join('');
      $$('[data-unpick]', root).forEach(function (b) { b.addEventListener('click', function () { picked.splice(Number(b.getAttribute('data-unpick')), 1); renderPicked(); }); });
      uploadBtn.disabled = !picked.length;
      uploadBtn.textContent = picked.length ? 'Subir ' + picked.length + ' archivo' + (picked.length > 1 ? 's' : '') : 'Subir archivos';
      $('[data-clear-picked]', root).hidden = !picked.length;
      state.dirty = picked.length > 0;
    }
    function addFiles(list) {
      var max = info ? info.maxMb : 100;
      var exts = info ? info.extensions : null;
      Array.prototype.forEach.call(list, function (f) {
        var ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
        if (exts && exts.indexOf(ext) === -1) return toast('Tipo no permitido: ' + f.name, 'error');
        if (f.size > max * 1048576) return toast('Demasiado grande (máx. ' + max + ' MB): ' + f.name, 'error');
        if (picked.length >= 10) return toast('Máximo 10 archivos por carga.', 'error');
        picked.push(f);
      });
      renderPicked();
    }
    fileInput.addEventListener('change', function () { addFiles(fileInput.files); fileInput.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });
    $('[data-clear-picked]', root).addEventListener('click', function () { picked = []; renderPicked(); });

    uploadBtn.addEventListener('click', function () {
      var form = $('[data-meta]', root);
      var fd = new FormData();
      ['title', 'category', 'lang', 'tags', 'description'].forEach(function (n) { fd.append(n, form.elements[n].value); });
      picked.forEach(function (f) { fd.append('files', f); });
      var bar = $('[data-progress]', root);
      bar.hidden = false;
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Subiendo…';
      xhrUpload(API + '/admin/repository', fd, function (p) { $('span', bar).style.width = Math.round(p * 100) + '%'; })
        .then(function (out) { return out; }, function (err) { if (err.data && err.data.saved) return err.data; throw err; })
        .then(function (out) {
          if (out.saved.length) toast(out.saved.length + ' archivo(s) guardado(s)' + (info && info.driver === 'onedrive' ? ' en OneDrive.' : '.'), 'ok');
          (out.rejected || []).forEach(function (r) { toast(r.name + ': ' + r.message, 'error'); });
          picked = [];
          form.reset();
          renderPicked();
          loadStatus(); loadCats(); st.page = 1; load();
        })
        .catch(function (err) {
          (err.errors || []).forEach(function (e) { var fl = $('[data-field="' + e.field + '"]', form); if (fl) { fl.classList.add('is-invalid'); $('[data-error]', fl).textContent = e.message; } });
          errorToast(err);
          renderPicked();
        })
        .finally(function () { setTimeout(function () { bar.hidden = true; $('span', bar).style.width = '0'; }, 600); });
    });

    /* ---- list ---- */
    var t;
    $('[data-q]', root).addEventListener('input', function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value; st.page = 1; load(); }, 300); });
    $('[data-cat]', root).addEventListener('change', function (e) { st.category = e.target.value; st.page = 1; load(); });
    $('[data-type]', root).addEventListener('change', function (e) { st.type = e.target.value; st.page = 1; load(); });
    $('[data-lang]', root).addEventListener('change', function (e) { st.lang = e.target.value; st.page = 1; load(); });
    $$('[data-sort]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-sort');
        st.dir = st.sort === name && st.dir === 'desc' ? 'asc' : 'desc';
        st.sort = name;
        $$('[data-sort]', root).forEach(function (x) { x.setAttribute('aria-sort', x === b ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none'); });
        load();
      });
    });

    function load() {
      var p = new URLSearchParams({ page: st.page, sort: st.sort, dir: st.dir });
      ['q', 'category', 'type', 'lang'].forEach(function (k) { if (st[k]) p.set(k, st[k]); });
      api('GET', '/admin/repository?' + p).then(function (out) {
        var rows = $('[data-rows]', root);
        if (!rows) return;
        rows.innerHTML = out.data.length ? out.data.map(function (f) {
          var icon = /^image\//.test(f.mime_type) && f.storage === 'local'
            ? '<img class="saw-thumb" src="' + esc(repoFileUrl(f, true)) + '" alt="" loading="lazy">' : fileTypeBadge(f);
          return '<tr class="is-static" data-id="' + f.id + '">' +
            '<td><div class="saw-file-cell">' + icon + '<span class="saw-file-cell__text"><span class="saw-file-cell__title">' + esc(f.title || f.file_name) +
              (f.is_missing ? ' <span class="saw-badge saw-badge--bad">No está en OneDrive</span>' : '') + '</span><span class="saw-file-cell__name">' + esc(f.file_name) + '</span></span></div></td>' +
            '<td>' + (f.category ? esc(f.category) : '<span class="saw-muted">—</span>') + '</td>' +
            '<td>' + (f.lang ? esc(REPO_LANGS[f.lang]) : '<span class="saw-muted">—</span>') + '</td>' +
            '<td>' + formatSize(Number(f.size_bytes)) + '</td>' +
            '<td>' + esc(f.uploaded_by_name || '—') + '</td>' +
            '<td>' + esc(formatDate(f.created_at)) + '</td>' +
            '<td class="saw-actions-cell"><div class="saw-row-actions">' +
              '<a class="saw-btn saw-btn--ghost saw-btn--sm" href="' + esc(repoFileUrl(f)) + '" target="_blank" rel="noopener">Descargar</a>' +
              '<button class="saw-btn saw-btn--ghost saw-btn--sm" type="button" data-edit="' + f.id + '">Editar</button>' +
              '<button class="saw-btn saw-btn--danger saw-btn--sm" type="button" data-del="' + f.id + '">Eliminar</button>' +
            '</div></td></tr>';
        }).join('') : '<tr><td colspan="7" class="saw-empty">No hay archivos' + (st.q || st.category || st.type || st.lang ? ' con estos filtros' : ' todavía') + '.</td></tr>';
        var byId = {};
        out.data.forEach(function (f) { byId[f.id] = f; });
        $$('[data-edit]', rows).forEach(function (b) { b.addEventListener('click', function () { editFile(byId[b.getAttribute('data-edit')]); }); });
        $$('[data-del]', rows).forEach(function (b) { b.addEventListener('click', function () { deleteFile(byId[b.getAttribute('data-del')]); }); });
        var m = out.meta;
        $('[data-pager]', root).innerHTML = m.total + ' archivo' + (m.total === 1 ? '' : 's') + (m.pages > 1
          ? ' · página ' + m.page + ' de ' + m.pages +
            ' <button class="saw-btn saw-btn--ghost saw-btn--sm" type="button" data-p="' + (m.page - 1) + '"' + (m.page <= 1 ? ' disabled' : '') + '>‹ Anterior</button>' +
            '<button class="saw-btn saw-btn--ghost saw-btn--sm" type="button" data-p="' + (m.page + 1) + '"' + (m.page >= m.pages ? ' disabled' : '') + '>Siguiente ›</button>' : '');
        $$('[data-p]', root).forEach(function (b) { b.addEventListener('click', function () { st.page = Number(b.getAttribute('data-p')); load(); }); });
      }).catch(errorToast);
    }

    function editFile(f) {
      var where = f.storage === 'onedrive' ? 'OneDrive' : 'Servidor local';
      var modal = openModal(
        '<div class="saw-modal__head"><h2>Editar metadatos</h2><button class="saw-icon-btn" type="button" data-close aria-label="Cerrar">✕</button></div>' +
        '<div class="saw-modal__body"><form class="saw-form" data-edit-form novalidate>' +
          '<div class="saw-field" data-field="file_name"><label for="e-name">Nombre del archivo</label><input class="saw-input" id="e-name" name="file_name" maxlength="200" value="' + esc(f.file_name) + '"><span class="saw-field__help">La extensión se conserva. El cambio se aplica también en ' + esc(where) + '.</span><span class="saw-field__error" data-error></span></div>' +
          '<div class="saw-field" data-field="title"><label for="e-title">Título</label><input class="saw-input" id="e-title" name="title" maxlength="255" value="' + esc(f.title || '') + '"><span class="saw-field__error" data-error></span></div>' +
          '<div class="saw-field saw-field--half" data-field="category"><label for="e-cat">Categoría (carpeta)</label><input class="saw-input" id="e-cat" name="category" maxlength="120" list="r-cats" value="' + esc(f.category || '') + '"><span class="saw-field__help">Al cambiarla, el archivo se mueve de carpeta.</span><span class="saw-field__error" data-error></span></div>' +
          '<div class="saw-field saw-field--half" data-field="lang"><label for="e-lang">Idioma</label><select class="saw-select" id="e-lang" name="lang"><option value="">—</option>' +
            Object.keys(REPO_LANGS).map(function (k) { return '<option value="' + k + '"' + (f.lang === k ? ' selected' : '') + '>' + REPO_LANGS[k] + '</option>'; }).join('') + '</select></div>' +
          '<div class="saw-field" data-field="tags"><label for="e-tags">Etiquetas</label><input class="saw-input" id="e-tags" name="tags" maxlength="500" value="' + esc(f.tags || '') + '"><span class="saw-field__error" data-error></span></div>' +
          '<div class="saw-field" data-field="description"><label for="e-desc">Descripción</label><textarea class="saw-textarea" id="e-desc" name="description" maxlength="5000">' + esc(f.description || '') + '</textarea><span class="saw-field__error" data-error></span></div>' +
        '</form>' +
        '<dl class="saw-repo-meta"><dt class="saw-muted">Almacenamiento</dt><dd>' + esc(where) + (f.folder ? ' · /' + esc(f.folder) : '') + '</dd>' +
          '<dt class="saw-muted">Tipo / tamaño</dt><dd>' + esc(f.mime_type) + ' · ' + formatSize(Number(f.size_bytes)) + '</dd>' +
          '<dt class="saw-muted">Subido</dt><dd>' + esc(formatDate(f.created_at)) + ' · ' + esc(f.uploaded_by_name || '—') + '</dd>' +
          '<dt class="saw-muted">Última edición</dt><dd>' + esc(formatDate(f.updated_at)) + ' · ' + esc(f.updated_by_name || '—') + '</dd>' +
          (f.web_url ? '<dt class="saw-muted">OneDrive</dt><dd><a href="' + esc(f.web_url) + '" target="_blank" rel="noopener">Abrir en OneDrive ↗</a></dd>' : '') +
        '</dl></div>' +
        '<div class="saw-modal__foot"><a class="saw-btn saw-btn--ghost" href="' + esc(repoFileUrl(f)) + '" target="_blank" rel="noopener">Descargar</a><span class="saw-form-actions__spacer"></span>' +
          '<button class="saw-btn saw-btn--ghost" type="button" data-close>Cancelar</button><button class="saw-btn saw-btn--gold" type="button" data-save>Guardar</button></div>');
      var form = $('[data-edit-form]', modal.box);
      $('[data-save]', modal.box).addEventListener('click', function () {
        var body = {};
        ['file_name', 'title', 'category', 'lang', 'tags', 'description'].forEach(function (n) { body[n] = form.elements[n].value; });
        $$('.saw-field', form).forEach(function (fl) { fl.classList.remove('is-invalid'); var e = $('[data-error]', fl); if (e) e.textContent = ''; });
        var btn = this;
        btn.disabled = true; btn.textContent = 'Guardando…';
        api('PUT', '/admin/repository/' + f.id, body).then(function () {
          toast('Metadatos actualizados.', 'ok');
          modal.close(); loadCats(); load();
        }).catch(function (err) {
          (err.errors || []).forEach(function (e) { var fl = $('[data-field="' + e.field + '"]', form); if (fl) { fl.classList.add('is-invalid'); $('[data-error]', fl).textContent = e.message; } });
          errorToast(err);
        }).finally(function () { btn.disabled = false; btn.textContent = 'Guardar'; });
      });
    }

    function deleteFile(f) {
      var where = f.storage === 'onedrive' ? 'Se enviará a la papelera de reciclaje de OneDrive.' : 'Se eliminará del servidor.';
      confirmDialog('Eliminar archivo', '¿Eliminar <strong>' + esc(f.file_name) + '</strong>? ' + where, 'Eliminar', true).then(function (ok) {
        if (!ok) return;
        api('DELETE', '/admin/repository/' + f.id).then(function () { toast('Archivo eliminado.', 'ok'); loadStatus(); loadCats(); load(); }).catch(errorToast);
      });
    }

    loadStatus();
    loadCats();
    load();
  }

  /* ======================================================================
     Boot
     ====================================================================== */
  $('#saw-menu').addEventListener('click', function () {
    var side = $('#saw-side');
    var open = !side.classList.contains('is-open');
    side.classList.toggle('is-open', open);
    this.setAttribute('aria-expanded', String(open));
  });
  $('#saw-logout').addEventListener('click', function () {
    api('POST', '/auth/logout').catch(function () {}).then(function () { state.dirty = false; window.location.href = (state.siteUrl || '') + '/login'; });
  });

  Promise.all([api('GET', '/admin/me'), api('GET', '/admin/schema')]).then(function (out) {
    state.me = out[0].data;
    state.siteUrl = (out[0].siteUrl || '').replace(/\/$/, '');
    state.schema = out[1].data;
    state.uploadMaxMb = out[1].uploadMaxMb;
    state.mediaTypes = out[1].mediaTypes;
    state.features = out[1].features || {};
    state.schema.forEach(function (r) { state.byKey[r.key] = r; });
    $('#saw-user').textContent = state.me.name + ' · ' + label(state.me.role);
    $('#saw-site').href = state.siteUrl + '/';
    buildNav();
    route();
  }).catch(function (err) {
    if (err.status !== 401) view().innerHTML = '<div class="saw-card saw-empty">' + esc(err.message) + '</div>';
  });
})();
