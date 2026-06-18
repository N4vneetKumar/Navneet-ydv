const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { query } = require('../config/postgres');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT d.*, o.estimated_weight, o.actual_weight, c.name as customer_name
     FROM disputes d
     JOIN orders o ON o.id = d.order_id
     JOIN users c ON c.id = d.customer_id
     ORDER BY d.created_at DESC`
  );
  res.json(rows);
});

module.exports = router;
