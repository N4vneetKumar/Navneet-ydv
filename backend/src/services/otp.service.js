const crypto = require('crypto');
const env = require('../config/env');
const { query } = require('../config/postgres');

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function storeOtp(orderId, otp) {
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60 * 1000);
  await query(
    `UPDATE orders SET otp_hash = $1, otp_expires_at = $2, updated_at = NOW() WHERE id = $3`,
    [hashOtp(otp), expiresAt, orderId]
  );
  return expiresAt;
}

async function verifyOtp(orderId, otp) {
  const { rows } = await query(
    `SELECT otp_hash, otp_expires_at FROM orders WHERE id = $1`,
    [orderId]
  );
  if (!rows.length || !rows[0].otp_hash) {
    return { valid: false, error: 'OTP not requested' };
  }
  if (new Date(rows[0].otp_expires_at) < new Date()) {
    return { valid: false, error: 'OTP expired' };
  }
  if (rows[0].otp_hash !== hashOtp(otp)) {
    return { valid: false, error: 'Invalid OTP' };
  }
  return { valid: true };
}

async function clearOtp(orderId) {
  await query(
    `UPDATE orders SET otp_hash = NULL, otp_expires_at = NULL WHERE id = $1`,
    [orderId]
  );
}

module.exports = { generateOtp, storeOtp, verifyOtp, clearOtp };
