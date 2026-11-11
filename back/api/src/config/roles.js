/**
 * User roles
 *  admin    — everything, including users and the email log
 *  editor   — website content, media, texts, contacts, subscribers, repository
 *  uploader — ONLY the file repository: upload, delete and edit metadata of THEIR OWN files;
 *             never sees where files are stored (account, OneDrive, folders)
 *  client   — no access to SAW (reserved for a future client portal)
 */
module.exports = {
  ALL: ['admin', 'editor', 'uploader', 'client'],
  SAW: ['admin', 'editor', 'uploader'],      // can enter /SAW
  CONTENT: ['admin', 'editor'],              // website content admin
  REPOSITORY: ['admin', 'editor', 'uploader'],
  REPOSITORY_SETTINGS: ['admin'],            // connect OneDrive, sync
  REPOSITORY_ALL: ['admin', 'editor'],       // see every file and the storage details (others: own files only)
};
