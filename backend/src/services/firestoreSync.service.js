const { getFirestore } = require('../config/firebase');

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    address: user.address || {},
    total_earnings: parseFloat(user.total_earnings) || 0,
    total_pickups: user.total_pickups || 0,
    commission_rate: parseFloat(user.commission_rate) || 0,
    pending_payout: parseFloat(user.pending_payout) || 0,
    vehicle_type: user.vehicle_type,
    is_active: user.is_active,
    is_blocked: user.is_blocked,
    is_clocked_in: user.is_clocked_in,
    notification_enabled: user.notification_enabled,
    updated_at: new Date().toISOString(),
  };
}

function serializeOrder(order) {
  return {
    id: order.id,
    customer_id: order.customer_id,
    assigned_boy_id: order.assigned_boy_id,
    items: order.items,
    estimated_weight: parseFloat(order.estimated_weight),
    actual_weight: order.actual_weight ? parseFloat(order.actual_weight) : null,
    total_amount: parseFloat(order.total_amount) || 0,
    payment_mode: order.payment_mode,
    status: order.status,
    customer_photo: order.customer_photo,
    scale_photo: order.scale_photo,
    vehicle_photo: order.vehicle_photo,
    pickup_date: order.pickup_date,
    pickup_time_slot: order.pickup_time_slot,
    address: order.address,
    gps_lat: parseFloat(order.gps_lat),
    gps_long: parseFloat(order.gps_long),
    flagged: order.flagged || false,
    dispute_expires_at: order.dispute_expires_at,
    commission_amount: parseFloat(order.commission_amount) || 0,
    created_at: order.created_at,
    updated_at: order.updated_at,
    completed_at: order.completed_at,
  };
}

async function syncUserToFirestore(user) {
  try {
    const db = getFirestore();
    await db.collection('users').doc(user.id).set(serializeUser(user), { merge: true });
  } catch (err) {
    console.warn('Firestore user sync failed:', err.message);
  }
}

async function syncOrderToFirestore(order) {
  try {
    const db = getFirestore();
    await db.collection('orders').doc(order.id).set(serializeOrder(order), { merge: true });
  } catch (err) {
    console.warn('Firestore order sync failed:', err.message);
  }
}

async function syncRatesToFirestore() {
  try {
    const { query } = require('../config/postgres');
    const { rows } = await query('SELECT * FROM rates WHERE is_active = true ORDER BY category, item_name');
    const db = getFirestore();
    const batch = db.batch();
    rows.forEach((rate) => {
      const ref = db.collection('rates').doc(rate.id);
      batch.set(ref, {
        id: rate.id,
        category: rate.category,
        item_name: rate.item_name,
        rate_per_kg: parseFloat(rate.rate_per_kg),
        is_active: rate.is_active,
        updated_at: new Date().toISOString(),
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Firestore rates sync failed:', err.message);
  }
}

async function logActivity(adminId, action, entityType, entityId, metadata = {}) {
  try {
    const { query } = require('../config/postgres');
    await query(
      `INSERT INTO activity_log (admin_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, entityType, entityId, JSON.stringify(metadata)]
    );
    const db = getFirestore();
    await db.collection('activity').add({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Activity log failed:', err.message);
  }
}

module.exports = {
  syncUserToFirestore,
  syncOrderToFirestore,
  syncRatesToFirestore,
  logActivity,
  serializeUser,
  serializeOrder,
};
