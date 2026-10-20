/**
 * Global front-end configuration.
 * API_BASE_URL: point it to the Node API (back/api). In production the API is
 * expected behind the same domain via reverse proxy (/api), so the default
 * relative path works without CORS. Override for local development.
 */
window.AF_CONFIG = Object.freeze({
  API_BASE_URL: (function () {
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4000/api';
    return '/api';
  })(),
  API_TIMEOUT_MS: 12000,
  SITE_URL: 'https://www.actuarialfactor.com',
  LOADER_MIN_MS: 600,
  POSTS_PER_PAGE: 9
});
