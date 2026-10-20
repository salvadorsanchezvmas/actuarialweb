/**
 * Single post: post.html?slug=my-post  →  GET /posts/:slug
 * Updates title/description/OG tags client-side (crawlers that don't run JS
 * use the defaults; for per-post social cards render server-side or prerender).
 */
(function (AF, api) {
  'use strict';

  var t = function (k, v) { return window.AF_I18N ? window.AF_I18N.t(k, v) : k; };
  var slug = new URLSearchParams(location.search).get('slug');
  var body = AF.$('#post-body');
  var title = AF.$('#post-title');
  var meta = AF.$('#post-meta');
  if (!body) return;

  function setMeta(selector, value) {
    var el = document.querySelector(selector);
    if (el && value) el.setAttribute('content', value);
  }

  if (!slug) {
    title.textContent = t('js.post_not_found');
    body.innerHTML = '<p><a class="link-arrow" href="insights.html">' + t('js.back_to_insights') + '</a></p>';
    return;
  }

  function render() {
    api.endpoints.post(slug).then(function (res) {
      var p = res && res.data;
      if (!p) throw new Error('Post not found');
      document.title = p.title + ' | Actuarial Factor';
      document.querySelector('title').removeAttribute('data-i18n');
      setMeta('meta[name="description"]', p.excerpt);
      setMeta('meta[property="og:title"]', p.title);
      setMeta('meta[property="og:description"]', p.excerpt);
      if (p.cover_image) setMeta('meta[property="og:image"]', p.cover_image);

      title.textContent = p.title;
      meta.innerHTML = '<span>' + AF.escape(p.category_name || t('js.insights')) + '</span> · <time datetime="' + AF.escape(p.published_at) + '">' + AF.formatDate(p.published_at) + '</time>' +
        (p.author_name ? ' · ' + AF.escape(p.author_name) : '');
      // Content is authored in the CMS/admin and stored as sanitized HTML by the API
      body.innerHTML = (p.cover_image ? '<img src="' + AF.escape(p.cover_image) + '" alt="">' : '') + p.content_html;
    }).catch(function (err) {
      title.textContent = t('js.post_not_found');
      body.innerHTML = '<p>' + AF.escape(err.message) + '</p><p><a class="link-arrow" href="insights.html">' + t('js.back_to_insights') + '</a></p>';
    });
  }
  render();
  document.addEventListener('af:langchange', function (e) { if (e.detail.changed) render(); });
})(window.AF, window.AF_API);
