// Load .env
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const path = require('path');

const authRoutes     = require('./routes/auth');
const generateRoutes = require('./routes/generate');
const recipesRoutes  = require('./routes/recipes');
const discoverRoutes = require('./routes/discover');
const adminRoutes    = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ────────────────────────────────────────────────
app.set('trust proxy', 1); // Trust Render's proxy for secure cookies

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session stored in PostgreSQL
app.use(session({
  name:   'chefmind.sid',
  secret: process.env.SESSION_SECRET || 'chefmind-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  store: new pgSession({
    pool: require('./database').pool,
    tableName: 'session'
  }),
  cookie: {
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
    httpOnly: true,
    sameSite: 'none',
    secure: true
  },
}));

// ── STATIC FILES ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API ROUTES ────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/recipes',  recipesRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/admin',    adminRoutes);

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), node: process.version });
});

// ── SPA FALLBACK ──────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── BACKGROUND JOBS ───────────────────────────────────────────
const { db } = require('./database');

// Cleanup search history older than 30 days every 24 hours
setInterval(async () => {
  try {
    await db.deleteOldHistory();
  } catch (e) {
    console.error('History cleanup error:', e);
  }
}, 1000 * 60 * 60 * 24);

// Also run once on startup
db.deleteOldHistory().catch(e => {});

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ✦ ChefMind running at  http://localhost:${PORT}`);
  console.log(`  ✦ Database             PostgreSQL`);
  console.log(`  ✦ Sessions             PostgreSQL`);
  console.log(`  ✦ Node.js              ${process.version}`);
  console.log(`  ✦ Press Ctrl+C to stop\n`);
});
