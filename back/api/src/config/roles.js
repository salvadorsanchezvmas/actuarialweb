/**
 * User roles
 *  admin    — everything, including users and the email log
 *  editor   — website content, media, texts, contacts, subscribers, repository
 *  uploader — ONLY the file repository (OneDrive): upload, delete, edit metadata
 *  client   — no access to SAW (reserved for a future client portal)
 */
module.exports = {
  ALL: ['admin', 'editor', 'uploader', 'client'],
  SAW: ['admin', 'editor', 'uploader'],      // can enter /SAW
  CONTENT: ['admin', 'editor'],              // website content admin
  REPOSITORY: ['admin', 'editor', 'uploader'],
  REPOSITORY_SETTINGS: ['admin'],            // connect OneDrive, sync
};
