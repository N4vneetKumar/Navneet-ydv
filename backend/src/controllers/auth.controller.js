const { query } = require('../config/postgres');
const { signToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const verifyValidators = [
  body('phone').isMobilePhone('any').withMessage('Valid phone required'),
  body('firebase_uid').optional().isString(),
];

async function verify(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { phone, firebase_uid } = req.body;
  const normalizedPhone = phone.replace(/\D/g, '').slice(-10);

  const { rows } = await query(
    `SELECT * FROM users WHERE phone LIKE $1 OR phone = $2`,
    [`%${normalizedPhone}`, normalizedPhone]
  );

  if (!rows.length) {
    return res.status(403).json({
      error: 'Phone not registered. Contact admin to create your account.',
    });
  }

  const user = rows[0];
  if (user.is_blocked || !user.is_active) {
    return res.status(403).json({ error: 'Account is blocked or inactive' });
  }

  if (firebase_uid) {
    await query('UPDATE users SET firebase_uid = $1, updated_at = NOW() WHERE id = $2', [
      firebase_uid,
      user.id,
    ]);
  }

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      total_earnings: parseFloat(user.total_earnings),
      total_pickups: user.total_pickups,
      commission_rate: parseFloat(user.commission_rate),
      pending_payout: parseFloat(user.pending_payout),
      is_clocked_in: user.is_clocked_in,
      notification_enabled: user.notification_enabled,
    },
  });
}

// Dev-only OTP bypass for testing without Firebase
async function devLogin(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { phone } = req.body;
  const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
  const { rows } = await query(
    `SELECT * FROM users WHERE phone LIKE $1 OR phone = $2`,
    [`%${normalizedPhone}`, normalizedPhone]
  );

  if (!rows.length) {
    return res.status(403).json({ error: 'Phone not registered' });
  }

  const user = rows[0];
  const token = signToken(user);
  res.json({ token, user: { ...user, total_earnings: parseFloat(user.total_earnings), pending_payout: parseFloat(user.pending_payout) } });
}

module.exports = { verify, verifyValidators, devLogin };
