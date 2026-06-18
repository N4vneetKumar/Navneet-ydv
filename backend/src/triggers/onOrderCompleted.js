const { notifyUser } = require('../services/notification.service');

async function onOrderCompleted(order) {
  await notifyUser(
    order.customer_id,
    'Pickup Receipt',
    `${order.actual_weight}kg | ₹${order.total_amount}`,
    {
      orderId: order.id,
      type: 'order_completed',
      weight: order.actual_weight,
      amount: order.total_amount,
    }
  );
}

module.exports = { onOrderCompleted };
