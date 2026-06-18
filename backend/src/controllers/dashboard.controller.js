const { query } = require('../config/postgres');

async function getDashboardStats(req, res) {
  const { rows: todayStats } = await query(
    `SELECT COALESCE(total_orders, 0) as today_orders, COALESCE(total_revenue, 0) as today_revenue
     FROM daily_stats WHERE stat_date = CURRENT_DATE`
  );

  const { rows: pendingRows } = await query(
    `SELECT COUNT(*) as pending_orders FROM orders WHERE status IN ('pending', 'assigned', 'in_progress')`
  );

  const { rows: boysRows } = await query(
    `SELECT COUNT(*) as active_boys FROM users WHERE role = 'pickup_boy' AND is_active = true AND is_clocked_in = true`
  );

  const { rows: flaggedRows } = await query(
    `SELECT o.*, c.name as customer_name FROM orders o
     LEFT JOIN users c ON c.id = o.customer_id
     WHERE o.flagged = true ORDER BY o.completed_at DESC LIMIT 10`
  );

  res.json({
    today_orders: parseInt(todayStats[0]?.today_orders || 0, 10),
    today_revenue: parseFloat(todayStats[0]?.today_revenue || 0),
    pending_orders: parseInt(pendingRows[0].pending_orders, 10),
    active_boys: parseInt(boysRows[0].active_boys, 10),
    flagged_orders: flaggedRows,
  });
}

async function getActivity(req, res) {
  const { limit = 50, offset = 0 } = req.query;
  const { rows } = await query(
    `SELECT a.*, u.name as admin_name FROM activity_log a
     LEFT JOIN users u ON u.id = a.admin_id
     ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json(rows);
}

module.exports = { getDashboardStats, getActivity };
