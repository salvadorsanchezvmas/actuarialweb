/**
 * Home: hydrates stats and the reviews carousel from the API.
 * The HTML ships with static content, so if the API is unavailable the page
 * still renders correctly (progressive enhancement).
 */
(function (AF, api) {
  'use strict';

  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>';

  function loadStats() {
    api.endpoints.stats().then(function (res) {
      var list = res && res.data;
      var wrap = AF.$('#stats');
      if (!wrap || !Array.isArray(list) || !list.length) return;
      wrap.innerHTML = list.map(function (s) {
        return '<div class="cstat reveal is-visible">' +
          '<div class="cstat__value"><span data-count="' + Number(s.value) + '">0</span><sup>' + AF.escape(s.suffix || '') + '</sup></div>' +
          '<div class="cstat__label">' + AF.escape(s.label) + '</div></div>';
      }).join('');
      AF.initCounters(wrap);
    }).catch(function () { /* keep static stats */ });
  }

  function loadTestimonials() {
    api.endpoints.testimonials().then(function (res) {
      var list = res && res.data;
      var track = AF.$('#testimonials');
      if (!track || !Array.isArray(list) || !list.length) return;
      track.innerHTML = list.map(function (t) {
        return '<article class="review" aria-roledescription="slide">' +
          '<span class="review__rating">' + STAR + AF.escape(Number(t.rating).toFixed(1)) + '/5</span>' +
          '<h4 class="review__role">' + AF.escape(t.author_role) + '</h4>' +
          '<blockquote>' + AF.escape(t.quote) + '</blockquote></article>';
      }).join('');
      var carousel = track.closest('[data-carousel]');
      if (carousel) AF.initCarousel(carousel);
    }).catch(function () { /* keep static reviews */ });
  }

  // The API returns content in the active language (?lang=): reload on change
  function loadAll() { loadStats(); loadTestimonials(); }
  document.addEventListener('af:langchange', function (e) { if (e.detail.changed) loadAll(); });
  loadAll();
})(window.AF, window.AF_API);
