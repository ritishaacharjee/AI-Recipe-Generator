// Load .env using Node 20.12+ built-in — no dotenv package needed
try { process.loadEnvFile('.env'); } catch {}

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
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
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session stored in ./sessions/ folder as JSON files — pure JS, no native deps
app.use(session({
  name:   'chefmind.sid',
  secret: process.env.SESSION_SECRET || 'chefmind-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  store: new FileStore({
    path:    path.join(__dirname, 'sessions'),
    ttl:     60 * 60 * 24 * 7,  // 7 days in seconds
    retries: 1,
    logFn:   () => {},           // suppress noisy logs
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
const { stmts } = require('./database');

// Cleanup search history older than 30 days every 24 hours
setInterval(() => {
  try {
    stmts.deleteOldHistory.run();
  } catch (e) {
    console.error('History cleanup error:', e);
  }
}, 1000 * 60 * 60 * 24);

// Also run once on startup
try { stmts.deleteOldHistory.run(); } catch(e) {}

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ✦ ChefMind running at  http://localhost:${PORT}`);
  console.log(`  ✦ Database             chefmind.db  (node:sqlite built-in)`);
  console.log(`  ✦ Sessions             ./sessions/  (file-based)`);
  console.log(`  ✦ Node.js              ${process.version}`);
  console.log(`  ✦ Press Ctrl+C to stop\n`);
});
