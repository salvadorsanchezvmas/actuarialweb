/**
 * Insights (News): list of posts with category filter and pagination.
 * Endpoint: GET /posts?page=&limit=&category=
 */
(function (AF, api, cfg) {
  'use strict';

  var t = function (k, v) { return window.AF_I18N ? window.AF_I18N.t(k, v) : k; };
  var grid = AF.$('#posts');
  var filters = AF.$('#post-filters');
  var pager = AF.$('#posts-pagination');
  if (!grid) return;

  var state = { page: 1, category: new URLSearchParams(location.search).get('category') || '' };

  function skeletons(n) {
    var html = '';
    for (var i = 0; i < n; i++) html += '<div class="skeleton" aria-hidden="true"></div>';
    return html;
  }

  function card(p) {
    var img = p.cover_image
      ? '<img src="' + AF.escape(p.cover_image) + '" alt="" loading="lazy" width="640" height="360">'
      : '';
    return '<article class="card post-card reveal">' +
      '<div class="post-card__img">' + img + '</div>' +
      '<div class="post-card__body">' +
      '<div class="post-card__meta"><span>' + AF.escape(p.category_name || t('js.insights')) + '</span><time datetime="' + AF.escape(p.published_at) + '">' + AF.formatDate(p.published_at) + '</time></div>' +
      '<h3>' + AF.escape(p.title) + '</h3>' +
      '<p>' + AF.escape(p.excerpt || '') + '</p>' +
      '<a class="link-arrow" href="post.html?slug=' + encodeURIComponent(p.slug) + '">' + t('js.read_more') + '</a>' +
      '</div></article>';
  }

  function renderPager(meta) {
    if (!pager) return;
    var pages = (meta && meta.pages) || 1;
    if (pages <= 1) { pager.innerHTML = ''; return; }
    var html = '';
    for (var i = 1; i <= pages; i++) {
      html += '<button type="button" data-page="' + i + '"' + (i === state.page ? ' class="is-active" aria-current="page"' : '') + '>' + i + '</button>';
    }
    pager.innerHTML = html;
  }

  function load() {
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = skeletons(3);
    api.endpoints.posts({ page: state.page, limit: cfg.POSTS_PER_PAGE, category: state.category })
      .then(function (res) {
        var list = (res && res.data) || [];
        grid.innerHTML = list.length ? list.map(card).join('') : '<p class="lead">' + t('js.no_posts') + '</p>';
        renderPager(res && res.meta);
        AF.observeReveal(grid);
      })
      .catch(function (err) {
        grid.innerHTML = '<p class="lead">' + AF.escape(err.message) + '</p>';
        renderPager(null);
      })
      .finally(function () { grid.removeAttribute('aria-busy'); });
  }

  function loadCategories() {
    if (!filters) return;
    api.endpoints.categories().then(function (res) {
      var cats = (res && res.data) || [];
      filters.innerHTML = '<button type="button" class="chip' + (!state.category ? ' is-active' : '') + '" data-category="">' + t('js.all_posts') + '</button>' +
        cats.map(function (c) {
          return '<button type="button" class="chip' + (state.category === c.slug ? ' is-active' : '') + '" data-category="' + AF.escape(c.slug) + '">' + AF.escape(c.name) + '</button>';
        }).join('');
    }).catch(function () { /* keep "All posts" only */ });
  }
  loadCategories();

  if (filters) {
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-category]');
      if (!btn) return;
      AF.$$('.chip', filters).forEach(function (c) { c.classList.toggle('is-active', c === btn); });
      state.category = btn.getAttribute('data-category');
      state.page = 1;
      load();
    });
  }

  if (pager) {
    pager.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-page]');
      if (!btn) return;
      state.page = Number(btn.getAttribute('data-page'));
      load();
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Reload translated content when the language changes
  document.addEventListener('af:langchange', function (e) { if (e.detail.changed) { loadCategories(); load(); } });

  load();
})(window.AF, window.AF_API, window.AF_CONFIG);
