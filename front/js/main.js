/**
 * Actuarial Factor — shared UI behaviour (all pages)
 * Loader, sticky/discreet header, right side navigation, reveal on scroll,
 * counters, flip cards, back-to-top and API-connected forms.
 */
(function (window, document) {
  'use strict';

  var cfg = window.AF_CONFIG;
  var api = window.AF_API;
  var i18n = window.AF_I18N;
  var t = function (key, vars) { return i18n ? i18n.t(key, vars) : key; };
  var root = document.documentElement;
  root.classList.remove('no-js');

  /* ---------- Helpers (exposed as window.AF) ---------- */
  var AF = window.AF = {
    $: function (sel, ctx) { return (ctx || document).querySelector(sel); },
    $$: function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); },
    escape: function (str) {
      return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    formatDate: function (value) {
      var d = new Date(value);
      var locale = window.AF_I18N && window.AF_I18N.lang === 'es' ? 'es-MX' : 'en-US';
      return isNaN(d) ? '' : d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    },
    observeReveal: function (ctx) { AF.$$('.reveal:not(.is-visible)', ctx).forEach(function (el) { revealObserver ? revealObserver.observe(el) : el.classList.add('is-visible'); }); }
  };

  /* ---------- Loader screen ---------- */
  var loader = AF.$('#loader');
  var start = Date.now();
  function hideLoader() {
    if (!loader) return;
    var wait = Math.max(0, cfg.LOADER_MIN_MS - (Date.now() - start));
    setTimeout(function () {
      loader.classList.add('is-hidden');
      loader.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
    }, wait);
  }
  var pageLoaded = new Promise(function (resolve) {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve);
  });
  Promise.all([pageLoaded, i18n ? i18n.ready : null]).then(hideLoader, hideLoader);
  setTimeout(hideLoader, 5000); // safety net if a resource hangs

  /* ---------- Header: compact on scroll, always visible ---------- */
  var header = AF.$('.header');
  var toTop = AF.$('.to-top');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 60); // stays visible: the header is always fixed
    }
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- Right side navigation ---------- */
  var sidenav = AF.$('#sidenav');
  var overlay = AF.$('.sidenav-overlay');
  var openers = AF.$$('[data-sidenav-open]');
  var lastFocus = null;

  function setSidenav(open) {
    if (!sidenav) return;
    sidenav.classList.toggle('is-open', open);
    overlay && overlay.classList.toggle('is-open', open);
    sidenav.setAttribute('aria-hidden', String(!open));
    sidenav.inert = !open;
    openers.forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    document.body.classList.toggle('is-locked', open);
    if (open) {
      lastFocus = document.activeElement;
      var first = AF.$('.sidenav__close', sidenav);
      first && first.focus();
    } else if (lastFocus) {
      lastFocus.focus();
    }
  }
  if (sidenav) {
    sidenav.inert = true;
    openers.forEach(function (b) { b.addEventListener('click', function () { setSidenav(true); }); });
    AF.$$('[data-sidenav-close]').forEach(function (b) { b.addEventListener('click', function () { setSidenav(false); }); });
    overlay && overlay.addEventListener('click', function () { setSidenav(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidenav.classList.contains('is-open')) setSidenav(false);
      // Keep focus inside the drawer while open
      if (e.key === 'Tab' && sidenav.classList.contains('is-open')) {
        var f = AF.$$('a, button', sidenav).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    // Accordion sub-menus
    AF.$$('.sidenav__toggle', sidenav).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sub = document.getElementById(btn.getAttribute('aria-controls'));
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        sub && sub.classList.toggle('is-open', !expanded);
      });
    });
    // Close drawer when following an in-page anchor
    AF.$$('a', sidenav).forEach(function (a) { a.addEventListener('click', function () { setSidenav(false); }); });
  }

  /* ---------- Active link highlighting ---------- */
  var page = document.body.getAttribute('data-page');
  if (page) {
    AF.$$('[data-nav="' + page + '"]').forEach(function (a) { a.setAttribute('aria-current', 'page'); });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;
  AF.observeReveal();

  /* ---------- Animated counters ---------- */
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var duration = 1600;
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  AF.initCounters = function (ctx) {
    var counters = AF.$$('[data-count]', ctx);
    if (!('IntersectionObserver' in window)) { counters.forEach(function (c) { c.textContent = c.getAttribute('data-count'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { animateCounter(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { io.observe(c); });
  };
  AF.initCounters();

  /* ---------- Flip cards: tap support on touch devices ---------- */
  AF.$$('.flip').forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      if (window.matchMedia('(hover: none)').matches) card.classList.toggle('is-flipped');
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('is-flipped'); }
    });
  });

  /* ---------- Carousel (reviews): scroll-snap track + dots + autoplay ---------- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  AF.initCarousel = function (root) {
    var track = AF.$('.reviews__track', root);
    var dotsWrap = AF.$('.reviews__dots', root);
    if (!track) return;
    if (root._afCarousel) root._afCarousel.destroy();

    var timer = null;
    var paused = false;
    var page = 0;

    function slides() { return AF.$$('.review', track); }
    function perView() {
      var s = slides();
      if (!s.length) return 1;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return Math.max(1, Math.round((track.clientWidth + gap) / (s[0].offsetWidth + gap)));
    }
    function pages() { return Math.max(1, Math.ceil(slides().length / perView())); }

    function renderDots() {
      if (!dotsWrap) return;
      var n = pages();
      var html = '';
      for (var i = 0; i < n; i++) {
        html += '<button type="button" role="tab" aria-label="' + t('js.carousel_goto', { n: i + 1, total: n }) + '" aria-selected="' + (i === page) + '" data-page="' + i + '"></button>';
      }
      dotsWrap.innerHTML = n > 1 ? html : '';
    }
    function setActive(i) {
      page = i;
      AF.$$('button', dotsWrap).forEach(function (b, idx) { b.setAttribute('aria-selected', String(idx === i)); });
    }
    function goTo(i) {
      var n = pages();
      i = (i + n) % n;
      var target = slides()[i * perView()];
      if (target) track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      setActive(i);
    }
    function play() {
      stop();
      if (!reduceMotion && pages() > 1) timer = setInterval(function () { if (!paused) goTo(page + 1); }, 6000);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }

    var scrollT;
    function onScroll() {
      clearTimeout(scrollT);
      scrollT = setTimeout(function () {
        var s = slides();
        if (!s.length) return;
        var step = s[0].offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
        var i = Math.round(track.scrollLeft / (step * perView()));
        // Reaching the end counts as the last page even if it is partial
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) i = pages() - 1;
        setActive(Math.min(i, pages() - 1));
      }, 120);
    }
    function onDot(e) { var b = e.target.closest('[data-page]'); if (b) { goTo(Number(b.getAttribute('data-page'))); play(); } }
    function pause() { paused = true; }
    function resume() { paused = false; }
    var touchT;
    function onTouchStart() { clearTimeout(touchT); paused = true; }
    function onTouchEnd() { clearTimeout(touchT); touchT = setTimeout(function () { paused = false; play(); }, 4000); }
    function onKey(e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(page + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(page - 1); }
    }
    var onResize = function () { renderDots(); setActive(Math.min(page, pages() - 1)); };

    track.addEventListener('scroll', onScroll, { passive: true });
    track.addEventListener('keydown', onKey);
    dotsWrap && dotsWrap.addEventListener('click', onDot);
    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', resume);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', resume);
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('af:langchange', onResize);

    renderDots();
    play();

    root._afCarousel = {
      destroy: function () {
        stop();
        track.removeEventListener('scroll', onScroll);
        track.removeEventListener('keydown', onKey);
        dotsWrap && dotsWrap.removeEventListener('click', onDot);
        root.removeEventListener('mouseenter', pause);
        root.removeEventListener('mouseleave', resume);
        root.removeEventListener('focusin', pause);
        root.removeEventListener('focusout', resume);
        clearTimeout(touchT);
        root.removeEventListener('touchstart', onTouchStart);
        root.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('af:langchange', onResize);
      }
    };
  };
  AF.$$('[data-carousel]').forEach(AF.initCarousel);

  /* ---------- Parallax backgrounds: <div data-parallax="0.25"> inside a clipped box ----------
     The element is oversized in CSS (inset: -18% 0) and shifted vertically
     according to how far its container has travelled through the viewport. */
  var parallaxEls = reduceMotion ? [] : AF.$$('[data-parallax]');
  if (parallaxEls.length) {
    var pTicking = false;
    var updateParallax = function () {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var box = el.parentElement.getBoundingClientRect();
        if (box.bottom < 0 || box.top > vh) return; // off screen
        // -1 when the box enters from the bottom, +1 when it leaves at the top
        var progress = (vh - box.top) / (vh + box.height) * 2 - 1;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.25;
        el.style.transform = 'translate3d(0,' + (progress * speed * box.height * -0.6).toFixed(1) + 'px,0)';
      });
      pTicking = false;
    };
    var requestParallax = function () {
      if (!pTicking) { window.requestAnimationFrame(updateParallax); pTicking = true; }
    };
    window.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', requestParallax);
    updateParallax();
  }

  /* ---------- Hero background video: always looping; paused only while off screen (battery) ---------- */
  var heroVideo = AF.$('[data-hero-video]');
  if (heroVideo) {
    // Pick the file for this screen before loading anything (one download only)
    var mobileVideo = window.matchMedia('(max-width: 767px)').matches && heroVideo.getAttribute('data-src-mobile');
    heroVideo.src = mobileVideo || heroVideo.getAttribute('data-src');
    heroVideo.preload = 'auto';
    heroVideo.muted = true; // iOS only autoplays muted videos (set as property too)
    var playHero = function () {
      var p = heroVideo.play();
      if (p && p.catch) p.catch(function () { /* autoplay blocked (e.g. iPhone Low Power Mode): poster stays visible */ });
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) playHero(); else heroVideo.pause();
      }, { threshold: 0.1 }).observe(heroVideo);
    }
  }

  /* ---------- No dragging images (Firefox ignores -webkit-user-drag) ---------- */
  document.addEventListener('dragstart', function (e) {
    if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO')) e.preventDefault();
  });

  /* ---------- Current year ---------- */
  function fillYear() { AF.$$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); }); }
  fillYear();
  // Translations replace markup that contains the year: refill after each change
  document.addEventListener('af:langchange', fillYear);

  /* ==========================================================================
     Forms connected to the API
     <form data-api-form="contact|newsletter|login|forgot"> ... </form>
     ========================================================================== */
  var validators = {
    required: function (v) { return v.trim() !== ''; },
    email: function (v) { return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
    phone: function (v) { return v === '' || /^[+()\d\s-]{7,20}$/.test(v); }
  };
  var messages = {
    get required() { return t('js.required'); },
    get email() { return t('js.email_invalid'); },
    get phone() { return t('js.phone_invalid'); },
    get consent() { return t('js.consent'); }
  };

  function setFieldError(input, msg) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var err = AF.$('.field__error', field);
    if (err) err.textContent = msg || '';
  }

  function validateForm(form) {
    var valid = true;
    AF.$$('input, select, textarea', form).forEach(function (input) {
      if (input.type === 'hidden' || input.classList.contains('hp-input')) return;
      var msg = '';
      if (input.type === 'checkbox') {
        if (input.required && !input.checked) msg = messages.consent;
      } else {
        var v = input.value || '';
        if (input.required && !validators.required(v)) msg = messages.required;
        else if (input.type === 'email' && !validators.email(v)) msg = messages.email;
        else if (input.type === 'tel' && !validators.phone(v)) msg = messages.phone;
      }
      setFieldError(input, msg);
      if (msg && valid) { valid = false; input.focus(); }
    });
    return valid;
  }

  function serialize(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = typeof value === 'string' ? value.trim() : value; });
    AF.$$('input[type="checkbox"]', form).forEach(function (c) { data[c.name] = c.checked; });
    return data;
  }

  function setStatus(form, type, text) {
    var box = AF.$('.form__status', form);
    if (!box) return;
    box.className = 'form__status' + (type ? ' is-' + type : '');
    box.textContent = text || '';
  }

  var handlers = {
    contact: function (data) { return api.endpoints.contact(data).then(function () { return t('js.contact_success'); }); },
    newsletter: function (data) { return api.endpoints.subscribe(data).then(function () { return t('js.newsletter_success'); }); },
    forgot: function (data) { return api.endpoints.forgotPassword(data).then(function () { return t('js.forgot_success'); }); },
    reset: function (data) {
      if (data.password !== data.password_confirm) return Promise.reject(new api.ApiError(t('js.passwords_mismatch'), 422));
      return api.endpoints.resetPassword({ token: data.token, password: data.password }).then(function () { return t('js.reset_success'); });
    },
    login: function (data) {
      return api.endpoints.login({ email: data.email, password: data.password }).then(function (r) {
        // The API sets an HttpOnly session cookie and says where this role goes
        // (admin/editor → content admin SAW). A ?next= is only honored for
        // same-site paths outside the admin.
        var next = new URLSearchParams(window.location.search).get('next');
        var safeNext = next && /^\/(?!\/)/.test(next) && next.indexOf('/SAW') !== 0 ? next : null;
        window.location.href = safeNext || (r && r.redirect) || 'index.html';
        return t('js.signed_in');
      });
    }
  };

  AF.$$('form[data-api-form]').forEach(function (form) {
    var type = form.getAttribute('data-api-form');
    var submit = AF.$('[type="submit"]', form);

    AF.$$('input, select, textarea', form).forEach(function (input) {
      input.addEventListener('blur', function () { if (input.getAttribute('aria-invalid') === 'true') validateForm(form); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus(form);
      if (!validateForm(form)) return;
      var data = serialize(form);
      if (data.website) return; // honeypot filled → silently drop
      delete data.website;
      data.source = data.source || window.location.pathname;

      var original = submit ? submit.innerHTML : ''; // current language label
      if (submit) { submit.disabled = true; submit.textContent = t('js.sending'); }
      (handlers[type] || handlers.contact)(data)
        .then(function (msg) {
          setStatus(form, 'success', msg);
          if (type !== 'login') form.reset();
        })
        .catch(function (err) {
          if (err.details && Array.isArray(err.details)) {
            err.details.forEach(function (d) {
              var input = form.elements[d.field];
              if (input) setFieldError(input, d.message);
            });
          }
          setStatus(form, 'error', err.message || t('js.generic_error'));
        })
        .finally(function () { if (submit) { submit.disabled = false; submit.innerHTML = original; } });
    });
  });

  /* ---------- Password visibility toggle ---------- */
  AF.$$('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-toggle-password'));
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? t('js.hide_password') : t('js.show_password'));
    });
  });

  /* ---------- Prefill service on contact form (?service=pricing) ---------- */
  var query = new URLSearchParams(window.location.search);
  var serviceSelect = AF.$('select[name="service"]');
  if (serviceSelect && query.get('service')) serviceSelect.value = query.get('service');
  // Password reset link from email: login.html?reset=<token>
  var resetForm = AF.$('#reset-form');
  if (resetForm && query.get('reset')) {
    resetForm.hidden = false;
    resetForm.elements.token.value = query.get('reset');
    AF.$$('[data-login-only]').forEach(function (el) { el.hidden = true; });
  }
  var subjectInput = AF.$('input[name="subject"]');
  if (subjectInput && query.get('subject')) subjectInput.value = query.get('subject').slice(0, 160);
})(window, document);
