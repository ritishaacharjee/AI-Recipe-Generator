'use strict';
const express = require('express');
const {
  lookupDish, discoverByPlace, getDishRecipe, suggestByWeatherCuisine,
  getWeatherList, getCuisineList, getPlaceList
} = require('../discoveryEngine');
const { stmts } = require('../database');

const router = express.Router();

// GET /api/discover/meta
router.get('/meta', (_req, res) => {
  res.json({ weathers: getWeatherList(), cuisines: getCuisineList() });
});

// GET /api/discover/places  — for autocomplete
router.get('/places', (_req, res) => {
  res.json(getPlaceList());
});

// GET /api/discover/history  — get search history for logged-in user
router.get('/history', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const history = stmts.getHistoryByUser.all(req.session.userId);
    res.json({ history });
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ error: 'Could not fetch history.' });
  }
});

// POST /api/discover/dish  — by dish name (Dish Lookup section)
router.post('/dish', (req, res) => {
  const { dishName, people, diets, skill } = req.body || {};
  if (!dishName?.trim()) return res.status(400).json({ error: 'Please enter a dish name.' });
  try {
    const result = lookupDish(dishName.trim(), people || 2, diets || [], skill || 'Intermediate');
    
    // Log history
    if (req.session.userId) {
      try { stmts.saveHistory.run({ user_id: req.session.userId, query: dishName.trim(), search_type: 'dish' }); } catch(e){}
    }
    
    return res.json(result);
  } catch (err) {
    console.error('Dish lookup error:', err);
    return res.status(500).json({ error: 'Could not generate recipe. Try a different dish name.' });
  }
});

// POST /api/discover/dish-recipe  — lazy: get full recipe for a card key
router.post('/dish-recipe', (req, res) => {
  const { dishKey, people, diets, skill } = req.body || {};
  if (!dishKey?.trim()) return res.status(400).json({ error: 'No dish key provided.' });
  try {
    const recipe = getDishRecipe(dishKey.trim(), people || 2, diets || [], skill || 'Intermediate');
    if (!recipe) return res.status(404).json({ error: 'Dish not found in database.' });
    return res.json({ recipe });
  } catch (err) {
    console.error('Dish recipe error:', err);
    return res.status(500).json({ error: 'Could not generate recipe.' });
  }
});

// POST /api/discover/place  — place discovery (returns cards, no recipes yet)
router.post('/place', (req, res) => {
  const { place } = req.body || {};
  if (!place?.trim()) return res.status(400).json({ error: 'Please enter a place name.' });
  try {
    const result = discoverByPlace(place.trim());
    if (!result) {
      return res.status(404).json({
        error: `No food data found for "${place}". Try: India, Punjab, Kerala, Italy, Japan, Thailand, France, Turkey, Mexico, USA, Nigeria, Brazil, or any major country or Indian state.`
      });
    }

    // Log history
    if (req.session.userId) {
      try { stmts.saveHistory.run({ user_id: req.session.userId, query: place.trim(), search_type: 'place' }); } catch(e){}
    }

    return res.json(result);
  } catch (err) {
    console.error('Place discovery error:', err);
    return res.status(500).json({ error: 'Could not fetch place dishes.' });
  }
});

// POST /api/discover/weather-cuisine  — weather & cuisine (returns cards)
router.post('/weather-cuisine', (req, res) => {
  const { weather, cuisine } = req.body || {};
  if (!weather && !cuisine) return res.status(400).json({ error: 'Please select a weather or cuisine.' });
  try {
    const result = suggestByWeatherCuisine(weather, cuisine);
    if (!result) return res.status(404).json({ error: 'No suggestions found. Try different options.' });

    // Log history
    if (req.session.userId) {
      const query = [weather, cuisine].filter(Boolean).join(' & ');
      try { stmts.saveHistory.run({ user_id: req.session.userId, query, search_type: 'weather-cuisine' }); } catch(e){}
    }

    return res.json(result);
  } catch (err) {
    console.error('Weather-cuisine suggestion error:', err);
    return res.status(500).json({ error: 'Could not generate suggestions.' });
  }
});

module.exports = router;
