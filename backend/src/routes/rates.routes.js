const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ratesController = require('../controllers/rates.controller');

const router = express.Router();

router.get('/', ratesController.listRates);

router.use(authenticate);
router.patch('/', requireRole('admin'), ratesController.updateRates);
router.post('/', requireRole('admin'), ratesController.rateValidators, ratesController.createRate);

module.exports = router;
