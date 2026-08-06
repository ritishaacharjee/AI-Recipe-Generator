const express = require('express');
const bcrypt = require('bcryptjs'); // pure JS — no Visual Studio needed
const { db } = require('../database');

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
    if (await db.getUserByEmail(email))
      return res.status(409).json({ error: 'Email already registered.' });
    if (await db.getUserByUsername(username))
      return res.status(409).json({ error: 'Username already taken.' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    // Make the very first user an admin
    let is_admin = 0;
    try {
      const userCount = await db.countUsers();
      if (parseInt(userCount.total) === 0) is_admin = 1;
    } catch(e) {}

    const user = await db.createUser(username, email, password_hash, is_admin);

    req.session.userId = Number(user.id);
    req.session.username = user.username;
    return res.status(201).json({ user: safeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed: ' + (err.message || err.toString()) });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const user = await db.getUserByEmail(email);
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
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = await db.getUserById(req.session.userId);
  return res.json({ user: user ? safeUser(user) : null });
});

module.exports = router;
