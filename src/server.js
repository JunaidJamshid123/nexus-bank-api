require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB, sequelize } = require('./config/db');
require('./models/auth'); // load associations
require('./models/account'); // load account associations
require('./models/transfer'); // load transfer associations
const authRoutes = require('./routes/auth/auth.routes');
const accountRoutes = require('./routes/account/account.routes');
const transferRoutes = require('./routes/transfer/transfer.routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── GLOBAL MIDDLEWARE ─────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, try again later' },
});
app.use('/api', limiter);

// ─── ROUTES ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Nexus Bank API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/transfer', transferRoutes);

// ─── ERROR HANDLING ────────────────────────────────────────
app.use(errorHandler);

// ─── START SERVER ──────────────────────────────────────────
const start = async () => {
  await connectDB();
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  console.log('Database tables synced');
  app.listen(PORT, () => {
    console.log(`Nexus Bank API running on port ${PORT}`);
  });
};

start();
