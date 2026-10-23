/**
 * OneDrive driver (Microsoft Graph v1.0).
 *
 * ONEDRIVE_AUTH=app        OneDrive for Business / SharePoint. Client-credentials
 *                          flow with TENANT_ID + CLIENT_ID + CLIENT_SECRET and an
 *                          application permission (Files.ReadWrite.All or
 *                          Sites.Selected). Target: DRIVE_ID, SITE_ID or USER.
 * ONEDRIVE_AUTH=delegated  Personal OneDrive. An admin signs in once from SAW
 *                          (OAuth code flow); the refresh token is stored
 *                          encrypted (AES-256-GCM) in integration_tokens.
 *
 * Files are uploaded under ONEDRIVE_ROOT_FOLDER/<folder>/<file name>.
 * Deleted items go to the OneDrive recycle bin (recoverable).
 */
const fs = require('fs');
const crypto = require('crypto');
const env = require('../../config/env');
const db = require('../../config/db');
const { HttpError } = require('../../utils/http');

const cfg = env.repository.onedrive;
const GRAPH = 'https://graph.microsoft.com/v1.0';
const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024;
const CHUNK = 320 * 1024 * 10; // upload sessions require multiples of 320 KiB
const DELEGATED_SCOPES = 'offline_access Files.ReadWrite User.Read';
const PROVIDER = 'onedrive';

/* ---------- Encryption of the stored refresh token ---------- */
function key() {
  if (!/^[a-f0-9]{64}$/i.test(cfg.tokenKey)) throw new HttpError(500, 'ONEDRIVE_TOKEN_KEY debe tener 64 caracteres hexadecimales.');
  return Buffer.from(cfg.tokenKey, 'hex');
}
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}
function decrypt(blob) {
  const [iv, tag, data] = blob.split('.').map((s) => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
}

/* ---------- Access tokens ---------- */
let cached = { token: null, expires: 0 };
const authority = () => `https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId || (cfg.auth === 'delegated' ? 'consumers' : 'common'))}/oauth2/v2.0`;

function missingConfig() {
  const need = ['clientId', 'clientSecret'];
  if (cfg.auth === 'app') need.push('tenantId');
  if (cfg.auth === 'delegated') need.push('redirectUri', 'tokenKey');
  const missing = need.filter((k) => !cfg[k]);
  if (cfg.auth === 'app' && !cfg.driveId && !cfg.siteId && !cfg.userId) missing.push('driveId | siteId | userId');
  return missing;
}

async function tokenRequest(params) {
  const res = await fetch(`${authority()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, `Microsoft rechazó la autenticación: ${data.error_description || data.error || res.status}`);
  return data;
}

async function getAccessToken() {
  if (cached.token && Date.now() < cached.expires - 60000) return cached.token;
  const missing = missingConfig();
  if (missing.length) throw new HttpError(503, `OneDrive no está configurado (falta: ${missing.join(', ')}).`);

  let data;
  if (cfg.auth === 'delegated') {
    const row = await db.queryOne('SELECT token_enc FROM integration_tokens WHERE provider = ?', [PROVIDER]);
    if (!row) throw new HttpError(503, 'OneDrive no está conectado. Un administrador debe conectarlo desde SAW › Repositorio.');
    data = await tokenRequest({ grant_type: 'refresh_token', refresh_token: decrypt(row.token_enc), scope: DELEGATED_SCOPES });
    // Microsoft rotates refresh tokens: keep the newest
    if (data.refresh_token) await db.query('UPDATE integration_tokens SET token_enc = ? WHERE provider = ?', [encrypt(data.refresh_token), PROVIDER]);
  } else {
    data = await tokenRequest({ grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default' });
  }
  cached = { token: data.access_token, expires: Date.now() + (data.expires_in || 3600) * 1000 };
  return cached.token;
}

/* ---------- Graph requests ---------- */
function driveBase() {
  if (cfg.auth === 'delegated') return '/me/drive';
  if (cfg.driveId) return `/drives/${encodeURIComponent(cfg.driveId)}`;
  if (cfg.siteId) return `/sites/${encodeURIComponent(cfg.siteId)}/drive`;
  return `/users/${encodeURIComponent(cfg.userId)}/drive`;
}
const encPath = (p) => p.split('/').filter(Boolean).map(encodeURIComponent).join('/');
const fullPath = (folder) => [cfg.rootFolder, folder].filter(Boolean).join('/');

async function graph(method, url, { body, headers, raw, retry = true } = {}) {
  const token = await getAccessToken();
  const res = await fetch(url.startsWith('http') ? url : GRAPH + url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  if (res.status === 429 && retry) { // throttled: wait and retry once
    const wait = Math.min(Number(res.headers.get('retry-after')) || 2, 10);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return graph(method, url, { body, headers, raw, retry: false });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) || `HTTP ${res.status}`;
    const err = new HttpError(res.status === 404 ? 404 : 502, `OneDrive: ${msg}`);
    err.graphCode = data && data.error && data.error.code;
    throw err;
  }
  return data;
}

/** Creates the folder chain (root folder + subfolder) if needed; returns the folder item */
async function ensureFolder(folder) {
  const target = fullPath(folder);
  try {
    return await graph('GET', `${driveBase()}/root:/${encPath(target)}`);
  } catch (err) { if (err.status !== 404) throw err; }
  let parent = '';
  let item = null;
  for (const name of target.split('/').filter(Boolean)) {
    const parentUrl = parent ? `${driveBase()}/root:/${encPath(parent)}:/children` : `${driveBase()}/root/children`;
    try {
      item = await graph('POST', parentUrl, { body: { name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' } });
    } catch (err) {
      if (err.graphCode !== 'nameAlreadyExists' && err.status !== 409) throw err;
      item = await graph('GET', `${driveBase()}/root:/${encPath(parent ? parent + '/' + name : name)}`);
    }
    parent = parent ? `${parent}/${name}` : name;
  }
  return item;
}

async function uploadLarge(localPath, size, target) {
  const session = await graph('POST', `${driveBase()}/root:/${encPath(target)}:/createUploadSession`, {
    body: { item: { '@microsoft.graph.conflictBehavior': 'rename' } },
  });
  const fh = await fs.promises.open(localPath, 'r');
  try {
    let offset = 0;
    let last = null;
    while (offset < size) {
      const length = Math.min(CHUNK, size - offset);
      const buf = Buffer.alloc(length);
      await fh.read(buf, 0, length, offset);
      // The upload URL is pre-authenticated: no Authorization header
      const res = await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Length': String(length), 'Content-Range': `bytes ${offset}-${offset + length - 1}/${size}` },
        body: buf,
      });
      if (!res.ok && res.status !== 202) {
        await fetch(session.uploadUrl, { method: 'DELETE' }).catch(() => {});
        throw new HttpError(502, `OneDrive interrumpió la carga (HTTP ${res.status}).`);
      }
      last = await res.json().catch(() => null);
      offset += length;
    }
    return last;
  } finally { await fh.close(); }
}

const toResult = (item) => ({ itemId: item.id, fileName: item.name, webUrl: item.webUrl || null, size: item.size });

module.exports = {
  name: 'onedrive',

  async status() {
    const missing = missingConfig();
    const base = { driver: 'onedrive', auth: cfg.auth, rootFolder: cfg.rootFolder };
    if (missing.length) return { ...base, configured: false, connected: false, message: `Falta configurar: ${missing.join(', ')}.` };
    if (cfg.auth === 'delegated') {
      const row = await db.queryOne('SELECT account FROM integration_tokens WHERE provider = ?', [PROVIDER]);
      if (!row) return { ...base, configured: true, connected: false, message: 'Pendiente: un administrador debe conectar la cuenta de OneDrive.' };
    }
    try {
      const drive = await graph('GET', `${driveBase()}?$select=id,driveType,owner,quota`);
      await ensureFolder('');
      const owner = drive.owner && (drive.owner.user || drive.owner.group);
      return {
        ...base, configured: true, connected: true,
        account: owner ? owner.displayName || owner.email : null,
        quota: drive.quota ? { used: drive.quota.used, total: drive.quota.total } : null,
        message: 'Conectado a OneDrive.',
      };
    } catch (err) {
      return { ...base, configured: true, connected: false, message: err.message };
    }
  },

  async upload({ localPath, size, folder, fileName }) {
    await ensureFolder(folder);
    const target = `${fullPath(folder)}/${fileName}`;
    if (size <= SIMPLE_UPLOAD_MAX) {
      const body = await fs.promises.readFile(localPath);
      const item = await graph('PUT', `${driveBase()}/root:/${encPath(target)}:/content?@microsoft.graph.conflictBehavior=rename`, {
        body, raw: true, headers: { 'Content-Type': 'application/octet-stream' },
      });
      return toResult(item);
    }
    return toResult(await uploadLarge(localPath, size, target));
  },

  async rename(itemId, fileName) {
    const item = await graph('PATCH', `${driveBase()}/items/${encodeURIComponent(itemId)}`, {
      body: { name: fileName, '@microsoft.graph.conflictBehavior': 'rename' },
    });
    return { fileName: item.name, webUrl: item.webUrl || null };
  },

  async move(itemId, folder) {
    const parent = await ensureFolder(folder);
    await graph('PATCH', `${driveBase()}/items/${encodeURIComponent(itemId)}`, {
      body: { parentReference: { id: parent.id }, '@microsoft.graph.conflictBehavior': 'rename' },
    });
    return { folder };
  },

  async remove(itemId) {
    try {
      await graph('DELETE', `${driveBase()}/items/${encodeURIComponent(itemId)}`);
    } catch (err) { if (err.status !== 404) throw err; } // already gone in OneDrive
  },

  /** Short-lived pre-authenticated URL: the browser downloads straight from OneDrive */
  async download(itemId) {
    const item = await graph('GET', `${driveBase()}/items/${encodeURIComponent(itemId)}?$select=id,name,@microsoft.graph.downloadUrl`);
    const url = item['@microsoft.graph.downloadUrl'];
    if (!url) throw new HttpError(502, 'OneDrive no devolvió un enlace de descarga.');
    return { redirectUrl: url };
  },

  /** All files under the root folder (2 levels of subfolders), for sync */
  async list() {
    await ensureFolder('');
    const out = [];
    const walk = async (folder, depth) => {
      let url = `${driveBase()}/root:/${encPath(fullPath(folder))}:/children?$top=200&$select=id,name,size,file,folder,webUrl`;
      while (url) {
        const page = await graph('GET', url);
        for (const it of page.value || []) {
          if (it.folder && depth < 2) await walk(folder ? `${folder}/${it.name}` : it.name, depth + 1);
          else if (it.file) out.push({ itemId: it.id, fileName: it.name, folder, size: it.size, mimeType: it.file.mimeType || 'application/octet-stream', webUrl: it.webUrl });
        }
        url = page['@odata.nextLink'] || null;
      }
    };
    await walk('', 0);
    return out;
  },

  /* ---------- Delegated mode: one-time connection by an admin ---------- */
  authorizeUrl(state) {
    const p = new URLSearchParams({
      client_id: cfg.clientId, response_type: 'code', redirect_uri: cfg.redirectUri,
      response_mode: 'query', scope: DELEGATED_SCOPES, state, prompt: 'select_account',
    });
    return `${authority()}/authorize?${p}`;
  },

  async completeAuthorization(code) {
    const data = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: cfg.redirectUri, scope: DELEGATED_SCOPES });
    if (!data.refresh_token) throw new HttpError(502, 'Microsoft no devolvió refresh token (¿falta el permiso offline_access?).');
    cached = { token: data.access_token, expires: Date.now() + (data.expires_in || 3600) * 1000 };
    let account = null;
    try {
      const me = await graph('GET', '/me?$select=displayName,userPrincipalName,mail');
      account = me.mail || me.userPrincipalName || me.displayName;
    } catch (e) { /* account name is optional */ }
    await db.query(
      'INSERT INTO integration_tokens (provider, account, token_enc) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE account = VALUES(account), token_enc = VALUES(token_enc)',
      [PROVIDER, account, encrypt(data.refresh_token)]
    );
    return { account };
  },

  async disconnect() {
    cached = { token: null, expires: 0 };
    await db.query('DELETE FROM integration_tokens WHERE provider = ?', [PROVIDER]);
  },
};
