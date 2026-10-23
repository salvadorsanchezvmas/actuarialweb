/** Picks the storage driver: REPO_DRIVER for new uploads, each file's own storage for existing ones. */
const env = require('../../config/env');
const drivers = { local: require('./local.driver'), onedrive: require('./onedrive.driver') };

module.exports = {
  active: () => drivers[env.repository.driver] || drivers.local,
  forStorage: (storage) => drivers[storage] || drivers.local,
  onedrive: drivers.onedrive,
};
