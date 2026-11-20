/**
 * Our firm: team members and open positions from the API.
 * Static team markup remains if the API is unavailable.
 */
(function (AF, api) {
  'use strict';

  var t = function (k, v) { return window.AF_I18N ? window.AF_I18N.t(k, v) : k; };
  var team = AF.$('#team-grid');
  var careers = AF.$('#careers-list');

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function loadTeam() {
    if (!team) return;
    api.endpoints.team().then(function (res) {
      var list = (res && res.data) || [];
      if (!list.length) return;
      team.innerHTML = list.map(function (m) {
        // Bios are stored as paragraphs separated by a blank line: the card shows the first one, the pop-up all of them
        var paras = String(m.bio || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
        var linkedin = m.linkedin_url
          ? '<p><a class="link-arrow" href="' + AF.escape(m.linkedin_url) + '" target="_blank" rel="noopener">LinkedIn</a></p>' : '';
        return '<article class="card team-card reveal">' +
          '<div class="team-card__photo"><img src="' + AF.escape(m.photo_url || 'img/favicon/icon-512.png') + '" alt="' + AF.escape(m.name) + '" loading="lazy" width="160" height="160"></div>' +
          '<div class="team-card__role">' + AF.escape(m.role) + '</div>' +
          '<h3>' + AF.escape(m.name) + '</h3>' +
          (paras[0] ? '<p class="team-card__summary">' + AF.escape(paras[0]) + '</p>' : '') +
          (paras.length ? '<button class="btn btn--light btn--bordered team-card__open" type="button" data-bio-open>' + t('js.read_bio') + ' ' + ARROW + '</button>' : '') +
          '<div class="team-card__bio" hidden>' + paras.map(function (p) { return '<p>' + AF.escape(p) + '</p>'; }).join('') + linkedin + '</div>' +
          '</article>';
      }).join('');
      AF.observeReveal(team);
    }).catch(function () { /* keep static */ });
  }

  /* ---------- Full bio pop-up ---------- */
  var modal = AF.$('#bio-modal');
  var lastOpener = null;
  function openBio(card, opener) {
    if (!modal || !card) return;
    var img = AF.$('.team-card__photo img', card);
    var photo = AF.$('.bio-modal__photo', modal);
    photo.src = img ? img.getAttribute('src') : '';
    photo.alt = img ? img.alt : '';
    AF.$('[data-bio-role]', modal).textContent = AF.$('.team-card__role', card).textContent;
    AF.$('[data-bio-name]', modal).textContent = AF.$('h3', card).textContent;
    AF.$('[data-bio-body]', modal).innerHTML = AF.$('.team-card__bio', card).innerHTML;
    lastOpener = opener;
    if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    document.documentElement.classList.add('bio-open');
    AF.$('[data-bio-body]', modal).scrollTop = 0;
  }
  function closeBio() {
    if (!modal) return;
    if (typeof modal.close === 'function') modal.close(); else modal.removeAttribute('open');
  }
  if (modal) {
    modal.addEventListener('close', function () {
      document.documentElement.classList.remove('bio-open');
      if (lastOpener) lastOpener.focus();
    });
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-bio-close]') || e.target === modal) closeBio(); // close button or backdrop
    });
  }
  if (team) team.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-bio-open]');
    if (btn) openBio(btn.closest('.team-card'), btn);
  });

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
