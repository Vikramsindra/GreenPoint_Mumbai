// api/index.js
// GreenPoint Mumbai — Express server entry point

require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const helmet   = require('helmet');
const cors     = require('cors');

// ─── Routes ───────────────────────────────────────────────────────────────────

const authRouter       = require('./src/routes/auth');
const pointsRouter     = require('./src/routes/points');
const violationsRouter = require('./src/routes/violations');
const awarenessRouter  = require('./src/routes/awareness');

// ─── Jobs ─────────────────────────────────────────────────────────────────────

require('./src/jobs/penaltyEscalation'); // registers monthly cron on import

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();

// Security + parsing middleware
app.use(helmet());
app.use(cors({ origin: '*' })); // tighten in production
app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth',       authRouter);
app.use('/api/points',     pointsRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/awareness',  awarenessRouter);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ─── 404 handler ──────────────────────────────────────────────────────────────

app.use((_req, res) =>
  res.status(404).json({ success: false, data: {}, message: 'Route not found' })
);

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, data: {}, message: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected:', process.env.MONGO_URI);
    app.listen(PORT, () =>
      console.log(`🚀  GreenPoint API running → http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
