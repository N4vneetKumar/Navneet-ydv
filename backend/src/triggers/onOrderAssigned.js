const { notifyUser } = require('../services/notification.service');

async function onOrderAssigned(order, boy) {
  await notifyUser(
    boy.id,
    'New Pickup Assigned',
    `Pickup at ${order.address?.address_line || 'customer location'} on ${order.pickup_date}`,
    { orderId: order.id, type: 'order_assigned' }
  );
}

module.exports = { onOrderAssigned };
