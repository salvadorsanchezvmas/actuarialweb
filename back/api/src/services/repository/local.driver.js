/**
 * Local storage driver for the repository (development or until OneDrive is
 * configured). Same interface as onedrive.driver.js. Files are stored outside
 * the public website folder under a random key; MySQL keeps names/metadata.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../../config/env');
const { HttpError } = require('../../utils/http');

const dir = env.repository.localDir;
const abs = (itemId) => {
  if (!/^[a-f0-9]{24}(\.[a-z0-9]{1,5})?$/.test(itemId)) throw new HttpError(400, 'Archivo no válido.');
  return path.join(dir, itemId);
};

module.exports = {
  name: 'local',

  async status() {
    await fs.promises.mkdir(dir, { recursive: true });
    return { driver: 'local', configured: true, connected: true, account: null, message: 'Almacenamiento local del servidor (OneDrive aún no configurado).' };
  },

  async upload({ localPath, fileName }) {
    await fs.promises.mkdir(dir, { recursive: true });
    const ext = path.extname(fileName).toLowerCase().slice(0, 6);
    const itemId = crypto.randomBytes(12).toString('hex') + ext;
    await fs.promises.copyFile(localPath, abs(itemId));
    return { itemId, fileName, webUrl: null };
  },

  async rename(itemId, fileName) { return { fileName, webUrl: null }; },
  async move(itemId, folder) { return { folder }; },

  async remove(itemId) {
    await fs.promises.unlink(abs(itemId)).catch((err) => { if (err.code !== 'ENOENT') throw err; });
  },

  /** Returns a readable stream for the API to send */
  async download(itemId) {
    const file = abs(itemId);
    await fs.promises.access(file).catch(() => { throw new HttpError(404, 'El archivo ya no existe en el almacenamiento.'); });
    return { stream: fs.createReadStream(file) };
  },

  async list() { return null; }, // nothing to sync: local files only come from SAW
};
