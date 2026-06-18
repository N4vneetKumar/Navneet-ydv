const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { initFirebase } = require('./config/firebase');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const ordersRoutes = require('./routes/orders.routes');
const ratesRoutes = require('./routes/rates.routes');
const activityRoutes = require('./routes/activity.routes');
const disputesRoutes = require('./routes/disputes.routes');
const settlementsRoutes = require('./routes/settlements.routes');

const app = express();

initFirebase();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: env.nodeEnv });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/rates', ratesRoutes);
app.use('/api/dashboard', activityRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/settlements', settlementsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  console.log(`Recycle Me API running on http://localhost:${env.port}`);
});

module.exports = app;
