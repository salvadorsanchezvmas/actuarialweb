const router = require('express').Router();
const db = require('../config/db');

router.get('/health', async (req, res) => {
  let database = 'ok';
  try { await db.ping(); } catch { database = 'down'; }
  res.status(database === 'ok' ? 200 : 503).json({ status: database === 'ok' ? 'ok' : 'degraded', database, time: new Date().toISOString() });
});

router.use('/', require('./content.routes'));
router.use('/', require('./forms.routes'));
router.use('/posts', require('./posts.routes'));
router.use('/auth', require('./auth.routes'));

module.exports = router;
