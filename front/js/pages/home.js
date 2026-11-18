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
      if (track.hasAttribute('data-static-reviews')) return; // backup page keeps the reviews in its HTML
      track.innerHTML = list.map(function (t) {
        var rated = t.rating !== null && t.rating !== undefined && t.rating !== '';
        return '<article class="review' + (rated ? '' : ' review--plain') + '" aria-roledescription="slide">' +
          (rated ? '<span class="review__rating">' + STAR + AF.escape(Number(t.rating).toFixed(1)) + '/5</span>' : '') +
          '<blockquote>' + AF.escape(t.quote) + '</blockquote>' +
          // Who said it, as a signature under the quote
          '<p class="review__cite"><cite>' + AF.escape(t.author_role) + '</cite></p></article>';
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
