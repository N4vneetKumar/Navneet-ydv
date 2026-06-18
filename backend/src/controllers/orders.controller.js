const { query } = require('../config/postgres');
const { syncOrderToFirestore, logActivity } = require('../services/firestoreSync.service');
const { completeOrder, calculateOrderAmount } = require('../services/orderCompletion.service');
const { generateOtp, storeOtp } = require('../services/otp.service');
const { notifyUser } = require('../services/notification.service');
const { onOrderAssigned } = require('../triggers/onOrderAssigned');
const { onDisputeRaised } = require('../triggers/onDisputeRaised');
const env = require('../config/env');
const { body, validationResult } = require('express-validator');

async function listOrders(req, res) {
  const { status, customer_id } = req.query;
  let sql = `
    SELECT o.*, c.name as customer_name, c.phone as customer_phone,
           b.name as boy_name
    FROM orders o
    LEFT JOIN users c ON c.id = o.customer_id
    LEFT JOIN users b ON b.id = o.assigned_boy_id
    WHERE 1=1`;
  const params = [];

  if (req.user.role === 'customer') {
    params.push(req.user.id);
    sql += ` AND o.customer_id = $${params.length}`;
  } else if (req.user.role === 'pickup_boy') {
    params.push(req.user.id);
    sql += ` AND o.assigned_boy_id = $${params.length}`;
  }

  if (status) {
    params.push(status);
    sql += ` AND o.status = $${params.length}`;
  }
  if (customer_id && req.user.role === 'admin') {
    params.push(customer_id);
    sql += ` AND o.customer_id = $${params.length}`;
  }

  sql += ' ORDER BY o.created_at DESC';
  const { rows } = await query(sql, params);
  res.json(rows.map(formatOrder));
}

async function getOrder(req, res) {
  const { rows } = await query(
    `SELECT o.*, c.name as customer_name, c.phone as customer_phone, b.name as boy_name
     FROM orders o
     LEFT JOIN users c ON c.id = o.customer_id
     LEFT JOIN users b ON b.id = o.assigned_boy_id
     WHERE o.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Order not found' });

  const order = rows[0];
  if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (req.user.role === 'pickup_boy' && order.assigned_boy_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(formatOrder(order));
}

async function createOrder(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    items, estimated_weight, pickup_date, pickup_time_slot,
    address, gps_lat, gps_long, customer_photo,
  } = req.body;

  const { rows } = await query(
    `INSERT INTO orders (
      customer_id, items, estimated_weight, pickup_date, pickup_time_slot,
      address, gps_lat, gps_long, customer_photo, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING *`,
    [
      req.user.id,
      JSON.stringify(items),
      estimated_weight,
      pickup_date,
      pickup_time_slot,
      JSON.stringify(address),
      gps_lat,
      gps_long,
      customer_photo,
    ]
  );

  const order = rows[0];
  await syncOrderToFirestore(order);
  res.status(201).json(formatOrder(order));
}

async function assignOrder(req, res) {
  const { assigned_boy_id } = req.body;

  const { rows: boyRows } = await query(
    `SELECT * FROM users WHERE id = $1 AND role = 'pickup_boy' AND is_active = true AND is_clocked_in = true`,
    [assigned_boy_id]
  );
  if (!boyRows.length) {
    return res.status(400).json({ error: 'Pickup boy not found or not clocked in' });
  }

  const { rows } = await query(
    `UPDATE orders SET assigned_boy_id = $1, status = 'assigned', updated_at = NOW()
     WHERE id = $2 AND status = 'pending' RETURNING *`,
    [assigned_boy_id, req.params.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Order not found or not pending' });

  const order = rows[0];
  await syncOrderToFirestore(order);
  await onOrderAssigned(order, boyRows[0]);
  await logActivity(req.user.id, `Admin ${req.user.name} assigned order to ${boyRows[0].name}`, 'order', order.id);

  res.json(formatOrder(order));
}

async function startOrder(req, res) {
  const { rows } = await query(
    `UPDATE orders SET status = 'in_progress', updated_at = NOW()
     WHERE id = $1 AND assigned_boy_id = $2 AND status = 'assigned' RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Cannot start this order' });

  await syncOrderToFirestore(rows[0]);
  res.json(formatOrder(rows[0]));
}

async function cancelOrder(req, res) {
  const { rows: existing } = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Order not found' });

  const order = existing[0];
  if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (!['pending', 'assigned'].includes(order.status)) {
    return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
  }

  const { rows } = await query(
    `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  await syncOrderToFirestore(rows[0]);
  res.json(formatOrder(rows[0]));
}

async function requestOtp(req, res) {
  const { rows } = await query(
    `SELECT * FROM orders WHERE id = $1 AND assigned_boy_id = $2 AND status = 'in_progress'`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(400).json({ error: 'Order not in progress' });

  const order = rows[0];
  const otp = generateOtp();
  await storeOtp(order.id, otp);

  const { rows: customerRows } = await query('SELECT * FROM users WHERE id = $1', [order.customer_id]);
  const customer = customerRows[0];

  await notifyUser(
    order.customer_id,
    'Pickup OTP',
    `Your verification OTP is: ${otp}`,
    { orderId: order.id, type: 'otp', otp },
    `Recycle Me OTP: ${otp}. Share with pickup boy to confirm collection.`
  );

  res.json({ message: 'OTP sent to customer', expires_in_minutes: env.otpTtlMinutes });
}

async function completeOrderHandler(req, res) {
  try {
    const order = await completeOrder(req.params.id, req.user.id, req.body);
    res.json(formatOrder(order));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function raiseDispute(req, res) {
  const { reason } = req.body;
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Order not found' });

  const order = rows[0];
  if (order.customer_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (order.status !== 'completed') return res.status(400).json({ error: 'Order not completed' });
  if (!order.dispute_expires_at || new Date(order.dispute_expires_at) < new Date()) {
    return res.status(400).json({ error: 'Dispute window has expired (5 minutes)' });
  }

  const { rows: disputeRows } = await query(
    `INSERT INTO disputes (order_id, customer_id, reason) VALUES ($1, $2, $3) RETURNING *`,
    [order.id, req.user.id, reason]
  );

  await query(`UPDATE orders SET status = 'disputed', updated_at = NOW() WHERE id = $1`, [order.id]);
  const updatedOrder = { ...order, status: 'disputed' };
  await syncOrderToFirestore(updatedOrder);
  await onDisputeRaised(disputeRows[0], order);

  res.json({ dispute: disputeRows[0], message: 'Dispute raised. Admin has been notified.' });
}

async function getActiveDispute(req, res) {
  const { rows } = await query(
    `SELECT o.id, o.dispute_expires_at, o.actual_weight, o.total_amount, o.status
     FROM orders o
     WHERE o.customer_id = $1 AND o.status = 'completed'
       AND o.dispute_expires_at > NOW()
     ORDER BY o.completed_at DESC LIMIT 1`,
    [req.user.id]
  );
  res.json(rows[0] || null);
}

function formatOrder(o) {
  return {
    id: o.id,
    customer_id: o.customer_id,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    assigned_boy_id: o.assigned_boy_id,
    boy_name: o.boy_name,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
    estimated_weight: parseFloat(o.estimated_weight),
    actual_weight: o.actual_weight ? parseFloat(o.actual_weight) : null,
    total_amount: parseFloat(o.total_amount) || 0,
    payment_mode: o.payment_mode,
    status: o.status,
    customer_photo: o.customer_photo,
    scale_photo: o.scale_photo,
    vehicle_photo: o.vehicle_photo,
    pickup_date: o.pickup_date,
    pickup_time_slot: o.pickup_time_slot,
    address: typeof o.address === 'string' ? JSON.parse(o.address) : o.address,
    gps_lat: parseFloat(o.gps_lat),
    gps_long: parseFloat(o.gps_long),
    flagged: o.flagged,
    dispute_expires_at: o.dispute_expires_at,
    commission_amount: parseFloat(o.commission_amount) || 0,
    created_at: o.created_at,
    completed_at: o.completed_at,
  };
}

const createOrderValidators = [
  body('items').isArray({ min: 1 }),
  body('estimated_weight').isFloat({ min: 0.1 }),
  body('pickup_date').isISO8601(),
  body('pickup_time_slot').notEmpty(),
  body('address').isObject(),
  body('gps_lat').isFloat(),
  body('gps_long').isFloat(),
];

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  assignOrder,
  startOrder,
  cancelOrder,
  requestOtp,
  completeOrderHandler,
  raiseDispute,
  getActiveDispute,
  createOrderValidators,
  formatOrder,
};
