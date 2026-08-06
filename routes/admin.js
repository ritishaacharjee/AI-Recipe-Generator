const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Middleware to check if user is admin
async function isAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const user = await db.getUserById(req.session.userId);
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Server Error' });
  }
}

// GET /api/admin/stats
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const users = (await db.countUsers()).total;
    const recipes = (await db.countRecipes()).total;
    const searches = (await db.countSearches()).total;

    const recentUsers = await db.getRecentUsers();
    const recentSearches = await db.getRecentSearches();

    res.json({
      stats: { users, recipes, searches },
      recentUsers,
      recentSearches
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

module.exports = router;
