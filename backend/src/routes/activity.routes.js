const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/stats', dashboardController.getDashboardStats);
router.get('/activity', dashboardController.getActivity);

module.exports = router;
