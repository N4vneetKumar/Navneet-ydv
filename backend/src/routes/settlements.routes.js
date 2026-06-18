const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../config/postgres');

const router = express.Router();

router.use(authenticate);

router.get('/:boyId', requireRole('admin'), async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM settlements WHERE pickup_boy_id = $1 ORDER BY created_at DESC',
    [req.params.boyId]
  );
  res.json(rows);
});

module.exports = router;
