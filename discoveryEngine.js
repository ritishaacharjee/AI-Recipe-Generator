'use strict';
const generateRecipe = require('./recipeEngine');
const DISH_INFO      = require('./data/dishInfo');
const PLACES         = require('./data/places');

// ── NORMALISE A SEARCH KEY ────────────────────────────────────
function normalise(str) {
  return str.toLowerCase().trim().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ');
}

// ── FUZZY PLACE LOOKUP ────────────────────────────────────────
function findPlace(query) {
  const q = normalise(query);

  // 1) Exact key
  if (PLACES[q]) return PLACES[q];

  // 2) Key contains query or query contains key
  for (const [key, val] of Object.entries(PLACES)) {
    if (q === key || q.includes(key) || key.includes(q)) return val;
  }

  // 3) Display-name match (first token in array)
  const qWords = q.split(' ').filter(Boolean);
  for (const val of Object.values(PLACES)) {
    const displayNorm = normalise(val[0].replace(/[^\w\s]/g, ''));
    if (qWords.every(w => displayNorm.includes(w))) return val;
  }

  return null;
}

// ── GET DISH INFO ─────────────────────────────────────────────
// DISH_INFO[key] = [name, cuisine, description]
function getDishCard(key) {
  const info = DISH_INFO[key];
  if (!info) return null;
  return { key, name: info[0], cuisine: info[1], description: info[2] };
}

// ── GENERATE FULL RECIPE FROM A DISH-INFO KEY ─────────────────
function generateFromKey(key, people = 2, diets = [], skill = 'Intermediate') {
  const info = DISH_INFO[key];
  if (!info) return null;
  const [name, cuisine] = info;
  const recipe = generateRecipe({
    ingredients: name,          // recipeEngine will parse dish name
    cuisine,
    diets,
    cookingTime: 50,
    servings: Number(people) || 2,
    skill,
  });
  recipe.title = name;
  return recipe;
}

// ── DISH NAME DIRECT LOOKUP (for Dish Lookup section) ─────────
const DISH_MAP_LEGACY = {
  'butter chicken':        { name:'Butter Chicken',          ing:'chicken, butter, tomato, cream, yogurt, garlic, ginger, garam masala',        cuisine:'Indian' },
  'biryani':               { name:'Chicken Biryani',         ing:'basmati rice, chicken, yogurt, onion, saffron, ghee, garam masala',            cuisine:'Indian' },
  'chicken biryani':       { name:'Chicken Biryani',         ing:'basmati rice, chicken, yogurt, onion, saffron, ghee, garam masala',            cuisine:'Indian' },
  'dal makhani':           { name:'Dal Makhani',             ing:'black lentils, butter, cream, tomato, garlic, ginger, garam masala',           cuisine:'Indian' },
  'palak paneer':          { name:'Palak Paneer',            ing:'paneer, spinach, onion, tomato, cream, garlic, ginger, garam masala',          cuisine:'Indian' },
  'chole':                 { name:'Chole Masala',            ing:'chickpeas, tomato, onion, ginger, garlic, chole masala, ghee',                 cuisine:'Indian' },
  'masala dosa':           { name:'Masala Dosa',             ing:'rice flour, potato, onion, mustard seeds, curry leaves, green chili, ghee',    cuisine:'Indian' },
  'aloo paratha':          { name:'Aloo Paratha',            ing:'wheat flour, potato, onion, green chili, coriander, butter, ghee',            cuisine:'Indian' },
  'rajma':                 { name:'Rajma Masala',            ing:'kidney beans, tomato, onion, garlic, ginger, garam masala, butter',            cuisine:'Indian' },
  'samosa':                { name:'Aloo Samosa',             ing:'flour, potato, peas, cumin, coriander, garam masala, oil',                    cuisine:'Indian' },
  'kheer':                 { name:'Rice Kheer',              ing:'milk, rice, sugar, cardamom, cashews, saffron, rose water',                    cuisine:'Indian' },
  'halwa':                 { name:'Sooji Halwa',             ing:'semolina, ghee, sugar, milk, cardamom, cashews, raisins',                     cuisine:'Indian' },
  'chicken tikka masala':  { name:'Chicken Tikka Masala',   ing:'chicken, yogurt, tomato, cream, onion, garam masala, kashmiri chili',          cuisine:'Indian' },
  'tikka masala':          { name:'Chicken Tikka Masala',   ing:'chicken, yogurt, tomato, cream, onion, garam masala',                          cuisine:'Indian' },
  'pasta carbonara':       { name:'Pasta Carbonara',         ing:'spaghetti, eggs, parmesan, bacon, black pepper, garlic, olive oil',            cuisine:'Italian' },
  'carbonara':             { name:'Pasta Carbonara',         ing:'spaghetti, eggs, parmesan, bacon, black pepper, garlic',                      cuisine:'Italian' },
  'pizza':                 { name:'Pizza Margherita',        ing:'flour, tomato sauce, mozzarella, basil, olive oil, yeast',                    cuisine:'Italian' },
  'risotto':               { name:'Mushroom Risotto',        ing:'arborio rice, mushrooms, onion, white wine, parmesan, butter, stock',          cuisine:'Italian' },
  'lasagna':               { name:'Beef Lasagna',            ing:'lasagna sheets, beef, tomato sauce, bechamel, mozzarella, parmesan, onion',    cuisine:'Italian' },
  'tiramisu':              { name:'Tiramisu',                ing:'ladyfinger biscuits, mascarpone, eggs, sugar, coffee, cocoa powder',           cuisine:'Italian' },
  'ramen':                 { name:'Chicken Ramen',           ing:'noodles, chicken broth, soy sauce, soft boiled eggs, nori, spring onion',      cuisine:'Japanese' },
  'teriyaki chicken':      { name:'Teriyaki Chicken',        ing:'chicken, soy sauce, mirin, sugar, sesame oil, ginger, spring onion',           cuisine:'Japanese' },
  'miso soup':             { name:'Miso Soup',               ing:'miso paste, tofu, seaweed, spring onion, dashi stock, mushrooms',              cuisine:'Japanese' },
  'sushi bowl':            { name:'Salmon Sushi Bowl',       ing:'sushi rice, salmon, avocado, cucumber, soy sauce, nori, sesame seeds',         cuisine:'Japanese' },
  'gyoza':                 { name:'Pan-Fried Gyoza',         ing:'flour, pork, cabbage, ginger, garlic, soy sauce, sesame oil',                 cuisine:'Japanese' },
  'pad thai':              { name:'Pad Thai',                ing:'rice noodles, shrimp, eggs, bean sprouts, spring onion, peanuts, fish sauce, tamarind', cuisine:'Thai' },
  'green curry':           { name:'Thai Green Curry',        ing:'chicken, coconut milk, green curry paste, thai basil, bamboo shoots, fish sauce', cuisine:'Thai' },
  'tom yum':               { name:'Tom Yum Soup',            ing:'shrimp, lemongrass, galangal, kaffir lime leaves, mushroom, fish sauce, chili, lime', cuisine:'Thai' },
  'massaman curry':        { name:'Massaman Curry',          ing:'chicken, coconut milk, potato, onion, peanuts, massaman paste, palm sugar',    cuisine:'Thai' },
  'tacos':                 { name:'Street Tacos',            ing:'tortilla, chicken, onion, coriander, lime, salsa, avocado, cumin',             cuisine:'Mexican' },
  'guacamole':             { name:'Classic Guacamole',       ing:'avocado, lime, onion, tomato, coriander, jalapeño, salt',                     cuisine:'Mexican' },
  'enchiladas':            { name:'Chicken Enchiladas',      ing:'tortillas, chicken, cheese, enchilada sauce, sour cream, onion',               cuisine:'Mexican' },
  'burger':                { name:'Classic Cheeseburger',    ing:'beef, burger bun, cheddar, lettuce, tomato, onion, pickles, ketchup',          cuisine:'American' },
  'mac and cheese':        { name:'Macaroni and Cheese',     ing:'macaroni, cheddar, butter, milk, flour',                                      cuisine:'American' },
  'pancakes':              { name:'Fluffy Pancakes',         ing:'flour, eggs, milk, butter, baking powder, sugar, vanilla, maple syrup',        cuisine:'American' },
  'bbq chicken':           { name:'BBQ Grilled Chicken',     ing:'chicken, BBQ sauce, garlic powder, smoked paprika, olive oil, honey',          cuisine:'American' },
  'caesar salad':          { name:'Caesar Salad',            ing:'romaine lettuce, parmesan, croutons, caesar dressing, lemon, garlic, anchovies', cuisine:'American' },
  'chocolate cake':        { name:'Chocolate Fudge Cake',    ing:'flour, cocoa powder, eggs, butter, sugar, baking powder, milk, vanilla',       cuisine:'American' },
  'fried rice':            { name:'Egg Fried Rice',          ing:'rice, eggs, spring onion, soy sauce, sesame oil, peas, carrot, garlic',        cuisine:'Chinese' },
  'kung pao chicken':      { name:'Kung Pao Chicken',        ing:'chicken, peanuts, dried chili, soy sauce, rice wine, spring onion, garlic, ginger', cuisine:'Chinese' },
  'shakshuka':             { name:'Shakshuka',               ing:'eggs, tomato, onion, bell pepper, garlic, cumin, paprika, olive oil',          cuisine:'Middle Eastern' },
  'hummus':                { name:'Classic Hummus',          ing:'chickpeas, tahini, lemon, garlic, olive oil, cumin, paprika',                  cuisine:'Middle Eastern' },
  'falafel':               { name:'Falafel',                 ing:'chickpeas, parsley, onion, garlic, cumin, coriander, flour',                  cuisine:'Middle Eastern' },
  'kebab':                 { name:'Seekh Kebab',             ing:'minced lamb, onion, garlic, ginger, cumin, coriander, chili',                  cuisine:'Middle Eastern' },
  'moussaka':              { name:'Moussaka',                ing:'eggplant, beef, tomato, onion, bechamel, parmesan, cinnamon, olive oil',       cuisine:'Greek' },
  'crepes':                { name:'French Crêpes',           ing:'flour, eggs, milk, butter, sugar, vanilla extract',                           cuisine:'French' },
  'french onion soup':     { name:'French Onion Soup',       ing:'onion, beef stock, butter, thyme, gruyere cheese, bread, white wine',          cuisine:'French' },
  'omelette':              { name:'Classic Herb Omelette',   ing:'eggs, butter, salt, pepper, herbs, cheese',                                   cuisine:'French' },
  'avocado toast':         { name:'Avocado Toast',           ing:'bread, avocado, lemon, salt, red chili flakes, olive oil, eggs',               cuisine:'American' },
  'sandwich':              { name:'Club Sandwich',           ing:'bread, chicken, lettuce, tomato, cheese, mayonnaise',                          cuisine:'American' },
  'soup':                  { name:'Hearty Vegetable Soup',   ing:'potato, carrot, celery, onion, tomato, stock, garlic, herbs',                  cuisine:'French' },
  'noodles':               { name:'Spicy Garlic Noodles',    ing:'noodles, garlic, soy sauce, sesame oil, chili, spring onion, egg',             cuisine:'Chinese' },
  'stir fry':              { name:'Vegetable Stir Fry',      ing:'mixed vegetables, garlic, ginger, soy sauce, sesame oil, oyster sauce',        cuisine:'Chinese' },
  'upma':                  { name:'Semolina Upma',           ing:'semolina, onion, mustard seeds, curry leaves, green chili, ginger, cashews',   cuisine:'Indian' },
  'poha':                  { name:'Kanda Poha',              ing:'flattened rice, onion, mustard seeds, curry leaves, peanuts, lemon, turmeric', cuisine:'Indian' },
  'idli':                  { name:'Soft Idli',               ing:'rice, urad dal, salt, water',                                                 cuisine:'South Indian' },
  'dosa':                  { name:'Plain Dosa',              ing:'rice flour, lentils, potato, onion, curry leaves',                             cuisine:'South Indian' },
};

function findDishLegacy(name) {
  const q = normalise(name);
  if (DISH_MAP_LEGACY[q]) return { ...DISH_MAP_LEGACY[q] };
  for (const [key, val] of Object.entries(DISH_MAP_LEGACY)) {
    if (q.includes(key) || key.includes(q)) return { ...val };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

/** 1. Dish Lookup: By name → full recipe */
module.exports.lookupDish = function(dishName, people, diets, skill) {
  const entry = findDishLegacy(dishName);
  if (!entry) {
    // Fallback: use name as ingredient query
    const recipe = generateRecipe({
      ingredients: dishName, cuisine: '', diets: diets || [],
      cookingTime: 45, servings: Number(people) || 2, skill: skill || 'Intermediate',
    });
    recipe.title = dishName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { found: false, recipe };
  }
  const recipe = generateRecipe({
    ingredients: entry.ing, cuisine: entry.cuisine, diets: diets || [],
    cookingTime: 50, servings: Number(people) || 2, skill: skill || 'Intermediate',
  });
  recipe.title = entry.name;
  return { found: true, recipe };
};

/** 2. Place Discovery: return lightweight card list (all dishes) */
module.exports.discoverByPlace = function(placeName) {
  const data = findPlace(placeName);
  if (!data) return null;

  const [display, desc, dishKeys] = data;
  const cards = dishKeys
    .map(key => getDishCard(key))
    .filter(Boolean);

  return {
    place: { display, description: desc },
    dishes: cards,            // lightweight — no recipe generation
  };
};

/** 3. Get full recipe for a dish key (lazy, on-demand) */
module.exports.getDishRecipe = function(dishKey, people, diets, skill) {
  return generateFromKey(dishKey, people, diets, skill);
};

/** 4. Mood & Weather suggestions */
const WEATHER_MAP = {
  rainy:   { label:'Rainy 🌧️',        desc:'Warm, comforting food to cosy up with on a grey, wet day.',                      keys:['tom-yum','french-onion-soup','dal-makhani','ramen','green-curry','miso-soup'] },
  cold:    { label:'Cold / Winter ❄️', desc:'Hearty, warming dishes that fight the chill from the inside.',                   keys:['butter-chicken','ramen','biryani','massaman-curry','goulash','hot-pot'] },
  hot:     { label:'Hot & Sunny ☀️',   desc:'Light, cooling and refreshing food for when it\'s scorching outside.',           keys:['greek-salad','guacamole','miso-soup','ceviche','gazpacho','goi-cuon'] },
  sunny:   { label:'Sunny ☀️',         desc:'Fresh and vibrant food to match the glorious weather.',                          keys:['bruschetta','tacos','pad-thai','som-tum','greek-salad','gazpacho'] },
  cloudy:  { label:'Overcast ☁️',      desc:'Soul-satisfying food to brighten a grey, gloomy day.',                           keys:['mac-cheese','shakshuka','biryani','pasta-carbonara','ramen','katsu-curry'] },
  windy:   { label:'Windy 💨',         desc:'Hot, filling dishes for blustery days when you need extra warmth.',              keys:['french-onion-soup','green-curry','ramen','goulash','dal-makhani','hot-pot'] },
  stormy:  { label:'Stormy ⛈️',        desc:'Stay-home, deeply comforting food for dramatic weather.',                        keys:['dal-makhani','mac-cheese','french-onion-soup','coq-au-vin','biryani','massaman-curry'] },
  snowy:   { label:'Snowy 🌨️',        desc:'Rich, slow-cooked dishes perfect for a snow day by the fire.',                   keys:['biryani','massaman-curry','butter-chicken','goulash','hot-pot','ramen'] },
};

const CUISINE_MAP = {
  indian:         { label: 'Indian',         keys: ['butter-chicken', 'biryani', 'dal-makhani', 'palak-paneer', 'chole', 'masala-dosa', 'rajma', 'aloo-paratha'] },
  italian:        { label: 'Italian',        keys: ['pasta-carbonara', 'pizza', 'risotto', 'lasagna', 'tiramisu'] },
  japanese:       { label: 'Japanese',       keys: ['ramen', 'teriyaki-chicken', 'miso-soup', 'sushi-bowl', 'gyoza'] },
  mexican:        { label: 'Mexican',        keys: ['tacos', 'guacamole', 'enchiladas'] },
  thai:           { label: 'Thai',           keys: ['pad-thai', 'green-curry', 'tom-yum', 'massaman-curry'] },
  american:       { label: 'American',       keys: ['burger', 'mac-and-cheese', 'pancakes', 'bbq-chicken'] },
  chinese:        { label: 'Chinese',        keys: ['fried-rice', 'kung-pao-chicken', 'noodles', 'stir-fry'] },
  middle_eastern: { label: 'Middle Eastern', keys: ['shakshuka', 'hummus', 'falafel', 'kebab'] },
  french:         { label: 'French',         keys: ['crepes', 'french-onion-soup', 'omelette', 'ratatouille'] },
};

module.exports.suggestByWeatherCuisine = function(weather, cuisine) {
  const w = WEATHER_MAP[(weather || '').toLowerCase()];
  const c = CUISINE_MAP[(cuisine || '').toLowerCase()];
  if (!w && !c) return null;

  // We want to intersect if BOTH are provided. If only one is provided, we just return its keys.
  let rawKeys = [];
  if (w && c) {
    const wSet = new Set(w.keys);
    rawKeys = c.keys.filter(k => wSet.has(k));
    // If no exact intersection, just combine and unique them
    if (rawKeys.length === 0) {
      rawKeys = [...w.keys, ...c.keys];
    }
  } else {
    rawKeys = [...(w ? w.keys : []), ...(c ? c.keys : [])];
  }

  const seen = new Set(); const unique = [];
  for (const k of rawKeys) { if (!seen.has(k)) { seen.add(k); unique.push(k); } }

  const cards = unique.slice(0, 10).map(key => getDishCard(key)).filter(Boolean);
  return {
    weather: w ? { label: w.label, description: w.desc } : null,
    cuisine: c ? { label: c.label } : null,
    dishes: cards,
  };
};

module.exports.getWeatherList = () => Object.entries(WEATHER_MAP).map(([k,v]) => ({ key: k, label: v.label }));
module.exports.getCuisineList = () => Object.entries(CUISINE_MAP).map(([k,v]) => ({ key: k, label: v.label }));

/** Get place list for autocomplete */
module.exports.getPlaceList = () =>
  Object.entries(PLACES).map(([key, val]) => ({ key, display: val[0] }));
