const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/postgres');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, env.jwtSecret);
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (!rows.length || !rows[0].is_active || rows[0].is_blocked) {
      return res.status(401).json({ error: 'Account inactive or blocked' });
    }

    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate, signToken };
