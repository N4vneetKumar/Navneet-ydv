const { pool } = require('../config/postgres');

async function settlePickupBoy(boyId, adminId, amount, paymentMode, notes) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT pending_payout FROM users WHERE id = $1 AND role = $2 FOR UPDATE',
      [boyId, 'pickup_boy']
    );
    if (!rows.length) throw new Error('Pickup boy not found');

    const pending = parseFloat(rows[0].pending_payout);
    if (amount > pending) throw new Error(`Cannot settle more than pending payout (₹${pending})`);

    await client.query(
      `UPDATE users SET pending_payout = pending_payout - $1, updated_at = NOW() WHERE id = $2`,
      [amount, boyId]
    );

    const { rows: settlementRows } = await client.query(
      `INSERT INTO settlements (pickup_boy_id, admin_id, amount, payment_mode, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [boyId, adminId, amount, paymentMode, notes]
    );

    await client.query('COMMIT');
    return settlementRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { settlePickupBoy };
