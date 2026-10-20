/**
 * Our firm: team members and open positions from the API.
 * Static team markup remains if the API is unavailable.
 */
(function (AF, api) {
  'use strict';

  var t = function (k, v) { return window.AF_I18N ? window.AF_I18N.t(k, v) : k; };
  var team = AF.$('#team-grid');
  var careers = AF.$('#careers-list');

  function loadTeam() {
    if (!team) return;
    api.endpoints.team().then(function (res) {
      var list = (res && res.data) || [];
      if (!list.length) return;
      team.innerHTML = list.map(function (m) {
        return '<article class="card team-card reveal">' +
          '<div class="team-card__photo"><img src="' + AF.escape(m.photo_url || 'img/favicon/icon-512.png') + '" alt="' + AF.escape(m.name) + '" loading="lazy" width="160" height="160"></div>' +
          '<div class="team-card__role">' + AF.escape(m.role) + '</div>' +
          '<h3>' + AF.escape(m.name) + '</h3>' +
          '<p>' + AF.escape(m.bio || '') + '</p></article>';
      }).join('');
      AF.observeReveal(team);
    }).catch(function () { /* keep static */ });
  }

  function loadCareers() {
    if (!careers) return;
    api.endpoints.careers().then(function (res) {
      var list = (res && res.data) || [];
      careers.innerHTML = list.length ? list.map(function (j) {
        return '<article class="card reveal">' +
          '<span class="card__tag">' + AF.escape(j.location) + ' · ' + AF.escape(j.employment_type) + '</span>' +
          '<h3>' + AF.escape(j.title) + '</h3>' +
          '<p>' + AF.escape(j.summary) + '</p>' +
          '<a class="link-arrow" href="contact.html?subject=' + encodeURIComponent(t('js.application_subject', { title: j.title })) + '#schedule">' + t('js.apply') + '</a></article>';
      }).join('') : '<p class="lead">' + t('js.no_positions') + '</p>';
      AF.observeReveal(careers);
    }).catch(function () {
      careers.innerHTML = '<p class="lead">' + t('js.send_cv') + '</p>';
    });
  }

  // The API returns content in the active language (?lang=): reload on change
  function loadAll() { loadTeam(); loadCareers(); }
  document.addEventListener('af:langchange', function (e) { if (e.detail.changed) loadAll(); });
  loadAll();
})(window.AF, window.AF_API);
