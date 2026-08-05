const express = require('express');
const generateRecipe = require('../recipeEngine');

const router = express.Router();

// POST /api/generate
// Uses the local recipe engine — no API key or external calls needed.
router.post('/', (req, res) => {
  const { ingredients, cuisine, diets, cookingTime, servings, skill } = req.body || {};

  if (!ingredients?.trim()) {
    return res.status(400).json({ error: 'Please provide at least one ingredient.' });
  }

  try {
    const recipe = generateRecipe({
      ingredients,
      cuisine:     cuisine     || '',
      diets:       Array.isArray(diets) ? diets : [],
      cookingTime: Number(cookingTime) || 45,
      servings:    Number(servings)    || 2,
      skill:       skill || 'Intermediate',
    });
    return res.json({ recipe });
  } catch (err) {
    console.error('Recipe engine error:', err);
    return res.status(500).json({ error: 'Failed to generate recipe. Please try again.' });
  }
});

const DISH_INFO = require('../data/dishInfo');

// POST /api/generate/mealplan
router.post('/mealplan', (req, res) => {
  const { diets, servings } = req.body || {};
  
  try {
    const allKeys = Object.keys(DISH_INFO);
    // Pick 7 random distinct keys
    const picked = [];
    while (picked.length < 7 && allKeys.length > 0) {
      const idx = Math.floor(Math.random() * allKeys.length);
      picked.push(allKeys[idx]);
      allKeys.splice(idx, 1);
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const mealPlan = picked.map((key, i) => {
      const [name, cuisine] = DISH_INFO[key];
      const recipe = generateRecipe({
        ingredients: name,
        cuisine,
        diets: Array.isArray(diets) ? diets : [],
        cookingTime: 45,
        servings: Number(servings) || 2,
        skill: 'Intermediate'
      });
      recipe.title = name;
      return { day: days[i], recipe };
    });

    return res.json({ mealPlan });
  } catch (err) {
    console.error('Meal planner error:', err);
    return res.status(500).json({ error: 'Failed to generate meal plan.' });
  }
});

module.exports = router;
