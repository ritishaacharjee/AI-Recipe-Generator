const express = require('express');
const bcrypt = require('bcryptjs'); // pure JS — no Visual Studio needed
const { stmts } = require('../database');

const router = express.Router();
const SALT_ROUNDS = 10;

function safeUser(u) {
  if (!u) return null;
  const { password_hash, ...safe } = u;
  // node:sqlite may return BigInt IDs — normalise to Number
  safe.id = Number(safe.id);
  return safe;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password are required.' });
  if (username.length < 3)
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email address.' });

  try {
    if (stmts.getUserByEmail.get(email))
      return res.status(409).json({ error: 'Email already registered.' });
    if (stmts.getUserByUsername.get(username))
      return res.status(409).json({ error: 'Username already taken.' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    // Make the very first user an admin
    let is_admin = 0;
    try {
      const userCount = stmts.countUsers.get();
      if (userCount.total === 0) is_admin = 1;
    } catch(e) {}

    const result = stmts.createUser.run({ username, email, password_hash, is_admin });
    const user = stmts.getUserById.get(Number(result.lastInsertRowid));

    req.session.userId = Number(user.id);
    req.session.username = user.username;
    return res.status(201).json({ user: safeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const user = stmts.getUserByEmail.get(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    req.session.userId = Number(user.id);
    req.session.username = user.username;
    return res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.clearCookie('chefmind.sid');
    return res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = stmts.getUserById.get(req.session.userId);
  return res.json({ user: user ? safeUser(user) : null });
});

// GET /api/auth/emergency-reset (TEMPORARY)
router.get('/emergency-reset', async (req, res) => {
  try {
    const password_hash = await bcrypt.hash('Admin123!', SALT_ROUNDS);
    stmts.db = require('../database').db;
    const db = require('../database').db;
    
    // Check if user exists
    const existing = db.prepare(`SELECT * FROM users WHERE email = 'ritishaacharjee2005@gmail.com'`).get();
    
    if (existing) {
      db.prepare(`UPDATE users SET password_hash = ?, is_admin = 1 WHERE email = 'ritishaacharjee2005@gmail.com'`).run(password_hash);
    } else {
      db.prepare(`INSERT INTO users (username, email, password_hash, is_admin) VALUES ('Admin', 'ritishaacharjee2005@gmail.com', ?, 1)`).run(password_hash);
    }
    
    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #c8860a;">Admin Account Created/Updated!</h1>
        <p>Your email: <b>ritishaacharjee2005@gmail.com</b></p>
        <p>Your new password: <b>Admin123!</b></p>
        <p>You can now go back to the app and Sign In.</p>
      </div>
    `);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

module.exports = router;
