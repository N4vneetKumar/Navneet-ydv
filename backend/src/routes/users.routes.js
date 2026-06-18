const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const usersController = require('../controllers/users.controller');

const router = express.Router();

router.use(authenticate);

router.get('/me', usersController.getMe);
router.patch('/me', usersController.updateMe);
router.patch('/me/fcm-token', usersController.updateFcmToken);
router.get('/me/addresses', usersController.getAddresses);
router.post('/me/addresses', usersController.addAddress);
router.patch('/me/addresses/:addressId', usersController.updateAddress);
router.delete('/me/addresses/:addressId', usersController.deleteAddress);
router.get('/me/attendance', requireRole('pickup_boy'), usersController.getAttendance);
router.post('/me/clock', requireRole('pickup_boy'), usersController.clockInOut);

router.get('/', requireRole('admin'), usersController.listUsers);
router.post('/', requireRole('admin'), usersController.createUserValidators, usersController.createUser);
router.get('/:id', requireRole('admin'), usersController.getUser);
router.patch('/:id', requireRole('admin'), usersController.updateUser);
router.delete('/:id', requireRole('admin'), usersController.deleteAdmin);
router.post('/:id/settle', requireRole('admin'), usersController.settlePayment);

module.exports = router;
