const express = require('express');
const { db } = require('../database');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session?.userId)
    return res.status(401).json({ error: 'You must be logged in to do that.' });
  next();
}

// Helper: parse JSON columns and normalise BigInt IDs
function parseRecipe(r) {
  return {
    ...r,
    id: Number(r.id),
    user_id: Number(r.user_id),
    ingredients: typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : r.ingredients,
    steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
  };
}

// GET /api/recipes
router.get('/', requireAuth, async (req, res) => {
  const rows = await db.getRecipesByUser(req.session.userId);
  return res.json({ recipes: rows.map(parseRecipe) });
});

// GET /api/recipes/stats
router.get('/stats', requireAuth, async (req, res) => {
  const row = await db.countRecipesByUser(req.session.userId);
  return res.json({ count: Number(row.count) });
});

// POST /api/recipes
router.post('/', requireAuth, async (req, res) => {
  const { title, cuisine, prepTime, cookTime, servings, calories, difficulty, ingredients, steps, chefTip } = req.body || {};

  if (!title || !Array.isArray(ingredients) || !Array.isArray(steps))
    return res.status(400).json({ error: 'title, ingredients (array), and steps (array) are required.' });

  try {
    const saved = await db.saveRecipe(
      req.session.userId,
      title,
      cuisine    || '',
      prepTime   || '',
      cookTime   || '',
      servings   || 2,
      calories   || 0,
      difficulty || '',
      JSON.stringify(ingredients),
      JSON.stringify(steps),
      chefTip   || ''
    );

    return res.status(201).json({ recipe: parseRecipe(saved) });
  } catch (err) {
    console.error('Save recipe error:', err);
    return res.status(500).json({ error: 'Failed to save recipe.' });
  }
});

// DELETE /api/recipes/:id
router.delete('/:id', requireAuth, async (req, res) => {
  await db.deleteRecipe(Number(req.params.id), req.session.userId);
  return res.json({ ok: true });
});

module.exports = router;
