const { query } = require('../config/postgres');
const { syncRatesToFirestore, logActivity } = require('../services/firestoreSync.service');
const { body, validationResult } = require('express-validator');

async function listRates(req, res) {
  const { rows } = await query(
    'SELECT * FROM rates WHERE is_active = true ORDER BY category, item_name'
  );
  res.json(rows.map((r) => ({
    ...r,
    rate_per_kg: parseFloat(r.rate_per_kg),
  })));
}

async function updateRates(req, res) {
  const { rates } = req.body;
  if (!Array.isArray(rates)) return res.status(400).json({ error: 'rates array required' });

  for (const rate of rates) {
    await query(
      `UPDATE rates SET rate_per_kg = $1, updated_at = NOW() WHERE id = $2`,
      [rate.rate_per_kg, rate.id]
    );
  }

  await syncRatesToFirestore();
  await logActivity(req.user.id, `Admin ${req.user.name} updated rates`, 'rates', null, { count: rates.length });

  const { rows } = await query('SELECT * FROM rates WHERE is_active = true ORDER BY category, item_name');
  res.json(rows.map((r) => ({ ...r, rate_per_kg: parseFloat(r.rate_per_kg) })));
}

async function createRate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { category, item_name, rate_per_kg } = req.body;
  const { rows } = await query(
    `INSERT INTO rates (category, item_name, rate_per_kg) VALUES ($1, $2, $3) RETURNING *`,
    [category, item_name, rate_per_kg]
  );
  await syncRatesToFirestore();
  res.status(201).json(rows[0]);
}

const rateValidators = [
  body('category').trim().notEmpty(),
  body('item_name').trim().notEmpty(),
  body('rate_per_kg').isFloat({ min: 0 }),
];

module.exports = { listRates, updateRates, createRate, rateValidators };
