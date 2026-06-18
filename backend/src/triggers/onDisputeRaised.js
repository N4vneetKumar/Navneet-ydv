const { notifyAllAdmins } = require('../services/notification.service');
const { getFirestore } = require('../config/firebase');

async function onDisputeRaised(dispute, order) {
  await notifyAllAdmins(
    'DISPUTE ALERT',
    `Customer disputed order ${order.id.slice(0, 8)} - ${dispute.reason || 'No reason given'}`,
    { orderId: order.id, disputeId: dispute.id, type: 'dispute_raised' }
  );

  try {
    const db = getFirestore();
    await db.collection('disputes').doc(dispute.id).set({
      id: dispute.id,
      order_id: dispute.order_id,
      customer_id: dispute.customer_id,
      reason: dispute.reason,
      status: dispute.status,
      created_at: dispute.created_at,
    });
  } catch (err) {
    console.warn('Firestore dispute sync failed:', err.message);
  }
}

module.exports = { onDisputeRaised };
