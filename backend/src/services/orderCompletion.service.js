const { pool } = require('../config/postgres');
const env = require('../config/env');
const { syncOrderToFirestore, syncUserToFirestore } = require('./firestoreSync.service');
const { validateGeoFence } = require('../middleware/geoFence');
const { verifyOtp, clearOtp } = require('./otp.service');
const { notifyUser, notifyAllAdmins } = require('./notification.service');

function calculateOrderAmount(items, actualWeight) {
  if (!items?.length) return 0;
  const avgRate = items.reduce((sum, i) => sum + (i.rate_per_kg || 0), 0) / items.length;
  return Math.round(actualWeight * avgRate * 100) / 100;
}

async function completeOrder(orderId, boyId, payload) {
  const {
    actual_weight,
    payment_mode,
    scale_photo,
    vehicle_photo,
    otp,
    boy_lat,
    boy_long,
  } = payload;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      `SELECT o.*, c.commission_rate as boy_commission_rate
       FROM orders o
       LEFT JOIN users c ON c.id = o.assigned_boy_id
       WHERE o.id = $1 FOR UPDATE`,
      [orderId]
    );

    if (!orderRows.length) throw new Error('Order not found');
    const order = orderRows[0];

    if (order.assigned_boy_id !== boyId) throw new Error('Not assigned to this order');
    if (order.status !== 'in_progress') throw new Error('Order must be in progress');

    if (!scale_photo || !vehicle_photo) {
      throw new Error('Both scale and vehicle photos are required');
    }

    const geo = validateGeoFence(boy_lat, boy_long, order.gps_lat, order.gps_long);
    if (!geo.valid) {
      throw new Error(`Must be within ${geo.maxAllowed}m of customer location (currently ${geo.distance}m away)`);
    }

    const otpCheck = await verifyOtp(orderId, otp);
    if (!otpCheck.valid) throw new Error(otpCheck.error);

    const totalAmount = calculateOrderAmount(order.items, actual_weight);
    const commissionRate = parseFloat(order.boy_commission_rate) || 0;
    const commissionAmount = Math.round(totalAmount * (commissionRate / 100) * 100) / 100;
    const flagged = actual_weight < env.weightFlagThreshold * parseFloat(order.estimated_weight);
    const disputeExpiresAt = new Date(Date.now() + env.disputeWindowMinutes * 60 * 1000);

    const { rows: updatedRows } = await client.query(
      `UPDATE orders SET
        actual_weight = $1, total_amount = $2, payment_mode = $3,
        scale_photo = $4, vehicle_photo = $5, status = 'completed',
        flagged = $6, commission_amount = $7, dispute_expires_at = $8,
        completed_at = NOW(), updated_at = NOW(),
        otp_hash = NULL, otp_expires_at = NULL
       WHERE id = $9 RETURNING *`,
      [actual_weight, totalAmount, payment_mode, scale_photo, vehicle_photo,
        flagged, commissionAmount, disputeExpiresAt, orderId]
    );

    await client.query(
      `UPDATE users SET
        total_earnings = total_earnings + $1,
        total_pickups = total_pickups + 1,
        updated_at = NOW()
       WHERE id = $2`,
      [totalAmount, order.customer_id]
    );

    await client.query(
      `UPDATE users SET
        pending_payout = pending_payout + $1,
        total_pickups = total_pickups + 1,
        updated_at = NOW()
       WHERE id = $2`,
      [commissionAmount, boyId]
    );

    await client.query(
      `INSERT INTO payment_ledger (customer_id, order_id, amount, type, description)
       VALUES ($1, $2, $3, 'pickup_payment', $4)`,
      [order.customer_id, orderId, totalAmount, `Payment for order ${orderId.slice(0, 8)}`]
    );

    await client.query(
      `INSERT INTO daily_stats (stat_date, total_orders, total_revenue)
       VALUES (CURRENT_DATE, 1, $1)
       ON CONFLICT (stat_date) DO UPDATE SET
         total_orders = daily_stats.total_orders + 1,
         total_revenue = daily_stats.total_revenue + $1,
         updated_at = NOW()`,
      [totalAmount]
    );

    await client.query('COMMIT');

    const completedOrder = updatedRows[0];

    const { rows: customerRows } = await pool.query('SELECT * FROM users WHERE id = $1', [order.customer_id]);
    const { rows: boyRows } = await pool.query('SELECT * FROM users WHERE id = $1', [boyId]);

    await syncOrderToFirestore(completedOrder);
    if (customerRows.length) await syncUserToFirestore(customerRows[0]);
    if (boyRows.length) await syncUserToFirestore(boyRows[0]);

    await notifyUser(
      order.customer_id,
      'Pickup Completed!',
      `Weight: ${actual_weight}kg | Amount: ₹${totalAmount}`,
      { orderId, type: 'order_completed', weight: actual_weight, amount: totalAmount },
      `Recycle Me: Pickup done. Weight ${actual_weight}kg, Amount ₹${totalAmount}. Dispute within 5 min in app.`
    );

    if (flagged) {
      await notifyAllAdmins(
        'Flagged Order Alert',
        `Order ${orderId.slice(0, 8)} flagged: actual weight ${actual_weight}kg vs estimated ${order.estimated_weight}kg`,
        { orderId, type: 'flagged_order' }
      );
    }

    return completedOrder;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { completeOrder, calculateOrderAmount };
