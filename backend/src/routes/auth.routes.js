const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');

const router = express.Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/verify', authLimiter, authController.verifyValidators, authController.verify);
router.post('/dev-login', authLimiter, authController.devLogin);

module.exports = router;
