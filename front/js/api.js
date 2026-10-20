/**
 * Thin fetch wrapper for the Actuarial Factor API.
 * Usage: AF_API.get('/posts', { page: 1 })  |  AF_API.post('/contact', data)
 * Every method resolves to the JSON body or rejects with an ApiError.
 */
(function (window) {
  'use strict';

  var cfg = window.AF_CONFIG;
  var TOKEN_KEY = 'af_token';

  function lang() { return (window.AF_I18N && window.AF_I18N.lang) || 'en'; }
  function t(key, fallback) { return window.AF_I18N ? window.AF_I18N.t(key) : fallback; }

  function ApiError(message, status, details) {
    this.name = 'ApiError';
    this.message = message;
    this.status = status || 0;
    this.details = details || null;
  }
  ApiError.prototype = Object.create(Error.prototype);

  function buildUrl(path, params) {
    var url = cfg.API_BASE_URL.replace(/\/$/, '') + path;
    if (params) {
      var qs = Object.keys(params)
        .filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
        .join('&');
      if (qs) url += (url.indexOf('?') === -1 ? '?' : '&') + qs;
    }
    return url;
  }

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function setToken(token) {
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* storage unavailable */ }
  }

  function request(method, path, options) {
    options = options || {};
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, cfg.API_TIMEOUT_MS);
    // Current language travels with every request so the API can localize content
    var headers = { Accept: 'application/json', 'Accept-Language': lang() };
    if (method === 'GET') options.params = Object.assign({ lang: lang() }, options.params);
    else if (options.body && typeof options.body === 'object') options.body = Object.assign({ lang: lang() }, options.body);
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    return fetch(buildUrl(path, options.params), {
      method: method,
      headers: headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      credentials: 'same-origin'
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = text ? JSON.parse(text) : null; } catch (e) { data = { message: text }; }
          if (!res.ok) {
            throw new ApiError((data && data.message) || 'Request failed', res.status, data && data.errors);
          }
          return data;
        });
      })
      .catch(function (err) {
        if (err instanceof ApiError) throw err;
        if (err.name === 'AbortError') throw new ApiError(t('js.timeout', 'The server took too long to respond. Please try again.'), 408);
        throw new ApiError(t('js.network', 'We could not connect to the server. Please try again later.'), 0);
      })
      .finally(function () { clearTimeout(timer); });
  }

  window.AF_API = {
    ApiError: ApiError,
    setToken: setToken,
    getToken: getToken,
    get: function (path, params) { return request('GET', path, { params: params }); },
    post: function (path, body) { return request('POST', path, { body: body }); },
    put: function (path, body) { return request('PUT', path, { body: body }); },
    del: function (path) { return request('DELETE', path); },

    /* Endpoint catalog — keep in sync with back/api/src/routes */
    endpoints: {
      stats: function () { return window.AF_API.get('/stats'); },
      testimonials: function () { return window.AF_API.get('/testimonials'); },
      services: function () { return window.AF_API.get('/services'); },
      service: function (slug) { return window.AF_API.get('/services/' + encodeURIComponent(slug)); },
      team: function () { return window.AF_API.get('/team'); },
      offices: function () { return window.AF_API.get('/offices'); },
      careers: function () { return window.AF_API.get('/careers'); },
      posts: function (params) { return window.AF_API.get('/posts', params); },
      post: function (slug) { return window.AF_API.get('/posts/' + encodeURIComponent(slug)); },
      categories: function () { return window.AF_API.get('/posts/categories'); },
      contact: function (data) { return window.AF_API.post('/contact', data); },
      subscribe: function (data) { return window.AF_API.post('/newsletter/subscribe', data); },
      login: function (data) { return window.AF_API.post('/auth/login', data); },
      me: function () { return window.AF_API.get('/auth/me'); },
      forgotPassword: function (data) { return window.AF_API.post('/auth/forgot-password', data); },
      resetPassword: function (data) { return window.AF_API.post('/auth/reset-password', data); }
    }
  };
})(window);
