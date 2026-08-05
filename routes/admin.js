const express = require('express');
const router = express.Router();
const { stmts } = require('../database');

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const user = stmts.getUserById.get(req.session.userId);
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Server Error' });
  }
}

// GET /api/admin/stats
router.get('/stats', isAdmin, (req, res) => {
  try {
    const users = stmts.countUsers.get().total;
    const recipes = stmts.countRecipes.get().total;
    const searches = stmts.countSearches.get().total;

    const recentUsers = stmts.getRecentUsers.all();
    const recentSearches = stmts.getRecentSearches.all();

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
