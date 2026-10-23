/**
 * File repository — /api/admin/repository/* (roles admin, editor, uploader)
 * plus the public OAuth callback for connecting a personal OneDrive.
 */
const express = require('express');
const crypto = require('crypto');
const env = require('../config/env');
const ROLES = require('../config/roles');
const repo = require('../admin/repository');
const storage = require('../services/repository');
const { requireRole } = require('../middleware/security');
const { asyncHandler, HttpError } = require('../utils/http');

const router = express.Router();
const adminOnly = requireRole(...ROLES.REPOSITORY_SETTINGS);
const idParam = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'ID no válido.');
  return id;
};

router.get('/status', asyncHandler(async (req, res) => res.json({ data: await repo.status() })));
router.get('/categories', asyncHandler(async (req, res) => res.json({ data: await repo.categories() })));
router.get('/', asyncHandler(async (req, res) => res.json(await repo.list(req.query))));

router.post('/', repo.receive, asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw new HttpError(422, 'Seleccione al menos un archivo.');
  const out = await repo.create(req.files, req.body || {}, req.user);
  res.status(out.saved.length ? 201 : 422).json(out);
}));

router.get('/:id', asyncHandler(async (req, res) => res.json({ data: await repo.getOne(idParam(req)) })));
router.get('/:id/download', asyncHandler(async (req, res) => repo.download(idParam(req), res, req.query.inline === '1')));
router.put('/:id', asyncHandler(async (req, res) => res.json({ data: await repo.update(idParam(req), req.body || {}, req.user) })));
router.delete('/:id', asyncHandler(async (req, res) => { await repo.remove(idParam(req)); res.json({ ok: true }); }));

/* ---------- Admin: sync and OneDrive connection ---------- */
router.post('/sync', adminOnly, asyncHandler(async (req, res) => {
  if (env.repository.driver !== 'onedrive') throw new HttpError(409, 'La sincronización solo aplica con REPO_DRIVER=onedrive.');
  res.json({ data: await repo.sync() });
}));

// Delegated (personal OneDrive): one-time states for the OAuth round trip
const pendingStates = new Map();
router.post('/onedrive/connect', adminOnly, (req, res) => {
  if (env.repository.onedrive.auth !== 'delegated') throw new HttpError(409, 'Solo aplica con ONEDRIVE_AUTH=delegated.');
  const state = crypto.randomBytes(24).toString('hex');
  pendingStates.set(state, { userId: req.user.id, expires: Date.now() + 10 * 60 * 1000 });
  res.json({ url: storage.onedrive.authorizeUrl(state) });
});
router.delete('/onedrive/connection', adminOnly, asyncHandler(async (req, res) => {
  await storage.onedrive.disconnect();
  res.json({ ok: true });
}));

/**
 * Public callback (Microsoft redirects the browser here). The session cookie
 * is SameSite=Strict and is not sent on this cross-site redirect, so the
 * request is authenticated by the one-time `state` created above.
 */
const callback = express.Router();
callback.get('/onedrive/callback', asyncHandler(async (req, res) => {
  const back = (q) => res.redirect(302, `${env.adminUrl}#/repository?${q}`);
  const pending = pendingStates.get(String(req.query.state || ''));
  pendingStates.delete(String(req.query.state || ''));
  if (!pending || pending.expires < Date.now()) return back('onedrive=state');
  if (req.query.error) return back('onedrive=denied');
  try {
    await storage.onedrive.completeAuthorization(String(req.query.code || ''));
    back('onedrive=connected');
  } catch (err) {
    console.error('[repository] OneDrive connection failed:', err.message);
    back('onedrive=error');
  }
}));

module.exports = { router, callback };
