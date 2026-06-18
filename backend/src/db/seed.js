const { pool } = require('../config/postgres');
const { syncUserToFirestore, syncRatesToFirestore } = require('../services/firestoreSync.service');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing seed data (dev only)
    await client.query(`DELETE FROM settlements`);
    await client.query(`DELETE FROM payment_ledger`);
    await client.query(`DELETE FROM disputes`);
    await client.query(`DELETE FROM orders`);
    await client.query(`DELETE FROM user_addresses`);
    await client.query(`DELETE FROM attendance`);
    await client.query(`DELETE FROM activity_log`);
    await client.query(`DELETE FROM rates`);
    await client.query(`DELETE FROM users`);

    const users = [
      { name: 'Admin User', phone: '9999900001', role: 'admin' },
      { name: 'Rajesh Kumar', phone: '9999900002', role: 'customer' },
      { name: 'Priya Sharma', phone: '9999900003', role: 'customer' },
      { name: 'Ramu Singh', phone: '9999900004', role: 'pickup_boy', commission_rate: 10, vehicle_type: 'Auto Rickshaw' },
      { name: 'Suresh Patel', phone: '9999900005', role: 'pickup_boy', commission_rate: 12, vehicle_type: 'Mini Truck' },
    ];

    const userIds = {};
    for (const u of users) {
      const { rows } = await client.query(
        `INSERT INTO users (name, phone, role, commission_rate, vehicle_type, is_clocked_in)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [u.name, u.phone, u.role, u.commission_rate || 0, u.vehicle_type || null, u.role === 'pickup_boy']
      );
      userIds[u.phone] = rows[0];
    }

    // Customer addresses
    await client.query(
      `INSERT INTO user_addresses (user_id, label, address_line, landmark, gps_lat, gps_long, is_default)
       VALUES ($1, 'Home', '123 Green Park, New Delhi', 'Near Metro Gate 2', 28.5494, 77.2000, true)`,
      [userIds['9999900002'].id]
    );

    const rates = [
      ['Metals', 'Copper', 520],
      ['Metals', 'Aluminium', 140],
      ['Metals', 'Iron', 25],
      ['Metals', 'Brass', 380],
      ['Plastics', 'PET Bottles', 18],
      ['Plastics', 'HDPE', 22],
      ['Plastics', 'Mixed Plastic', 12],
      ['Paper', 'Newspaper', 14],
      ['Paper', 'Cardboard', 10],
      ['Paper', 'Books', 8],
      ['E-Waste', 'Mobile Phones', 150],
      ['E-Waste', 'Laptops', 80],
      ['E-Waste', 'Cables', 90],
      ['Glass', 'Clear Glass', 5],
      ['Glass', 'Colored Glass', 3],
    ];

    for (const [category, item_name, rate_per_kg] of rates) {
      await client.query(
        `INSERT INTO rates (category, item_name, rate_per_kg) VALUES ($1, $2, $3)`,
        [category, item_name, rate_per_kg]
      );
    }

    await client.query('COMMIT');
    console.log('Seed data inserted successfully.');
    console.log('\nTest accounts (use these phone numbers for login):');
    users.forEach((u) => console.log(`  ${u.role.padEnd(12)} ${u.phone} - ${u.name}`));

    // Sync to Firestore if available
    try {
      for (const phone of Object.keys(userIds)) {
        await syncUserToFirestore(userIds[phone]);
      }
      await syncRatesToFirestore();
      console.log('\nSynced seed data to Firestore.');
    } catch (err) {
      console.warn('\nFirestore sync skipped:', err.message);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
