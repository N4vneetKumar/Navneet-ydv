const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ordersController = require('../controllers/orders.controller');

const router = express.Router();

router.use(authenticate);

router.get('/dispute/active', requireRole('customer'), ordersController.getActiveDispute);
router.get('/', ordersController.listOrders);
router.post('/', requireRole('customer'), ordersController.createOrderValidators, ordersController.createOrder);
router.get('/:id', ordersController.getOrder);
router.patch('/:id/assign', requireRole('admin'), ordersController.assignOrder);
router.patch('/:id/start', requireRole('pickup_boy'), ordersController.startOrder);
router.patch('/:id/cancel', ordersController.cancelOrder);
router.post('/:id/request-otp', requireRole('pickup_boy'), ordersController.requestOtp);
router.post('/:id/complete', requireRole('pickup_boy'), ordersController.completeOrderHandler);
router.post('/:id/dispute', requireRole('customer'), ordersController.raiseDispute);

module.exports = router;
