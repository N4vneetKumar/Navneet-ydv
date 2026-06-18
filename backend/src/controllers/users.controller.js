const { query } = require('../config/postgres');
const { syncUserToFirestore, logActivity } = require('../services/firestoreSync.service');
const { settlePickupBoy } = require('../services/ledger.service');
const { body, validationResult } = require('express-validator');

async function listUsers(req, res) {
  const { role, search } = req.query;
  let sql = 'SELECT id, name, phone, role, total_earnings, total_pickups, commission_rate, pending_payout, vehicle_type, is_active, is_blocked, is_clocked_in, created_at FROM users WHERE 1=1';
  const params = [];

  if (role) {
    params.push(role);
    sql += ` AND role = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
  }
  sql += ' ORDER BY created_at DESC';

  const { rows } = await query(sql, params);
  res.json(rows.map(formatUser));
}

async function getUser(req, res) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'User not found' });

  const user = rows[0];
  const stats = await getUserStats(user.id, user.role);
  res.json({ ...formatUser(user), stats });
}

async function getUserStats(userId, role) {
  if (role === 'customer') {
    const { rows } = await query(
      `SELECT COUNT(*) FILTER (WHERE status IN ('pending','assigned','in_progress')) as pending_orders,
              COUNT(*) FILTER (WHERE status = 'completed') as completed_orders
       FROM orders WHERE customer_id = $1`,
      [userId]
    );
    const { rows: ledger } = await query(
      'SELECT * FROM payment_ledger WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    return { ...rows[0], payment_ledger: ledger };
  }

  if (role === 'pickup_boy') {
    const { rows } = await query(
      `SELECT COUNT(*) FILTER (WHERE status IN ('assigned','in_progress') AND pickup_date = CURRENT_DATE) as today_pending,
              COUNT(*) FILTER (WHERE status = 'completed') as completed_orders
       FROM orders WHERE assigned_boy_id = $1`,
      [userId]
    );
    const { rows: settlements } = await query(
      'SELECT * FROM settlements WHERE pickup_boy_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    return { ...rows[0], settlements };
  }

  return {};
}

async function createUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, phone, role, address, commission_rate, vehicle_type } = req.body;

  try {
    const { rows } = await query(
      `INSERT INTO users (name, phone, role, address, commission_rate, vehicle_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, phone, role, JSON.stringify(address || {}), commission_rate || 0, vehicle_type]
    );
    const user = rows[0];
    await syncUserToFirestore(user);
    await logActivity(req.user.id, `Admin ${req.user.name} added ${role} ${name}`, 'user', user.id);
    res.status(201).json(formatUser(user));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Phone already registered' });
    throw err;
  }
}

async function updateUser(req, res) {
  const { name, is_active, is_blocked, commission_rate, vehicle_type, notification_enabled } = req.body;
  const fields = [];
  const params = [req.params.id];
  let idx = 2;

  if (name !== undefined) { fields.push(`name = $${idx++}`); params.push(name); }
  if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(is_active); }
  if (is_blocked !== undefined) { fields.push(`is_blocked = $${idx++}`); params.push(is_blocked); }
  if (commission_rate !== undefined) { fields.push(`commission_rate = $${idx++}`); params.push(commission_rate); }
  if (vehicle_type !== undefined) { fields.push(`vehicle_type = $${idx++}`); params.push(vehicle_type); }
  if (notification_enabled !== undefined) { fields.push(`notification_enabled = $${idx++}`); params.push(notification_enabled); }

  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

  fields.push('updated_at = NOW()');
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });

  await syncUserToFirestore(rows[0]);
  if (req.user.role === 'admin') {
    await logActivity(req.user.id, `Admin ${req.user.name} updated user ${rows[0].name}`, 'user', rows[0].id);
  }
  res.json(formatUser(rows[0]));
}

async function deleteAdmin(req, res) {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  const { rows } = await query(
    `DELETE FROM users WHERE id = $1 AND role = 'admin' RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Admin not found' });
  await logActivity(req.user.id, `Admin ${req.user.name} removed admin ${rows[0].name}`, 'user', rows[0].id);
  res.json({ message: 'Admin removed' });
}

async function getMe(req, res) {
  res.json(formatUser(req.user));
}

async function updateMe(req, res) {
  req.params.id = req.user.id;
  return updateUser(req, res);
}

async function updateFcmToken(req, res) {
  const { fcm_token } = req.body;
  await query('UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE id = $2', [
    fcm_token,
    req.user.id,
  ]);
  res.json({ message: 'FCM token updated' });
}

async function settlePayment(req, res) {
  const { amount, payment_mode, notes } = req.body;
  try {
    const settlement = await settlePickupBoy(req.params.id, req.user.id, amount, payment_mode, notes);
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (rows.length) await syncUserToFirestore(rows[0]);
    await logActivity(req.user.id, `Admin ${req.user.name} settled ₹${amount} to pickup boy`, 'settlement', settlement.id);
    res.json(settlement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function clockInOut(req, res) {
  const newState = !req.user.is_clocked_in;

  if (newState) {
    await query(
      `INSERT INTO attendance (pickup_boy_id, clock_in) VALUES ($1, NOW())`,
      [req.user.id]
    );
  } else {
    await query(
      `UPDATE attendance SET clock_out = NOW()
       WHERE pickup_boy_id = $1 AND clock_out IS NULL AND date = CURRENT_DATE`,
      [req.user.id]
    );
  }

  const { rows } = await query(
    `UPDATE users SET is_clocked_in = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [newState, req.user.id]
  );
  await syncUserToFirestore(rows[0]);
  res.json({ is_clocked_in: newState, user: formatUser(rows[0]) });
}

async function getAddresses(req, res) {
  const { rows } = await query(
    'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [req.user.id]
  );
  res.json(rows);
}

async function addAddress(req, res) {
  const { label, address_line, landmark, gps_lat, gps_long, is_default } = req.body;
  if (is_default) {
    await query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
  }
  const { rows } = await query(
    `INSERT INTO user_addresses (user_id, label, address_line, landmark, gps_lat, gps_long, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.id, label, address_line, landmark, gps_lat, gps_long, is_default || false]
  );
  res.status(201).json(rows[0]);
}

async function updateAddress(req, res) {
  const { label, address_line, landmark, gps_lat, gps_long, is_default } = req.body;
  if (is_default) {
    await query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
  }
  const { rows } = await query(
    `UPDATE user_addresses SET label=$1, address_line=$2, landmark=$3, gps_lat=$4, gps_long=$5, is_default=$6
     WHERE id=$7 AND user_id=$8 RETURNING *`,
    [label, address_line, landmark, gps_lat, gps_long, is_default, req.params.addressId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Address not found' });
  res.json(rows[0]);
}

async function deleteAddress(req, res) {
  await query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2', [
    req.params.addressId,
    req.user.id,
  ]);
  res.json({ message: 'Address deleted' });
}

async function getAttendance(req, res) {
  const { rows } = await query(
    `SELECT date, clock_in, clock_out FROM attendance
     WHERE pickup_boy_id = $1 ORDER BY date DESC LIMIT 60`,
    [req.user.id]
  );
  res.json(rows);
}

function formatUser(u) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    address: u.address,
    total_earnings: parseFloat(u.total_earnings) || 0,
    total_pickups: u.total_pickups || 0,
    commission_rate: parseFloat(u.commission_rate) || 0,
    pending_payout: parseFloat(u.pending_payout) || 0,
    vehicle_type: u.vehicle_type,
    is_active: u.is_active,
    is_blocked: u.is_blocked,
    is_clocked_in: u.is_clocked_in,
    notification_enabled: u.notification_enabled,
    created_at: u.created_at,
  };
}

const createUserValidators = [
  body('name').trim().notEmpty(),
  body('phone').trim().notEmpty(),
  body('role').isIn(['customer', 'pickup_boy', 'admin']),
];

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteAdmin,
  getMe,
  updateMe,
  updateFcmToken,
  settlePayment,
  clockInOut,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getAttendance,
  createUserValidators,
};
