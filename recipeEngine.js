'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ChefMind Local Recipe Engine
// Generates structured recipes entirely in JavaScript — no API key required.
// ─────────────────────────────────────────────────────────────────────────────

// ── INGREDIENT CLASSIFICATION ─────────────────────────────────
const PROTEINS  = ['chicken','beef','pork','lamb','turkey','duck','salmon','tuna','cod','shrimp','prawn','crab','tofu','tempeh','paneer','eggs','egg','lentils','chickpeas','beans','lentil','sausage','bacon','ham','mutton','fish'];
const GRAINS    = ['rice','pasta','noodles','bread','flour','quinoa','oats','barley','couscous','roti','tortilla','spaghetti','penne','fettuccine','udon','soba'];
const DAIRY     = ['butter','cream','milk','cheese','yogurt','curd','ghee','parmesan','mozzarella','feta','ricotta','paneer'];
const VEGETABLES= ['onion','garlic','tomato','potato','carrot','spinach','mushroom','pepper','broccoli','eggplant','zucchini','cabbage','celery','leek','pea','corn','bean','asparagus','kale','chard','beet','radish','cucumber','avocado','pumpkin','squash','capsicum'];
const AROMATICS = ['garlic','ginger','onion','shallot','scallion','chilli','chili','lemongrass','galangal'];

function classify(ingredients) {
  const lower = ingredients.map(i => i.toLowerCase().trim());
  return {
    proteins:   lower.filter(i => PROTEINS.some(p => i.includes(p))),
    grains:     lower.filter(i => GRAINS.some(g => i.includes(g))),
    dairy:      lower.filter(i => DAIRY.some(d => i.includes(d))),
    vegetables: lower.filter(i => VEGETABLES.some(v => i.includes(v))),
    aromatics:  lower.filter(i => AROMATICS.some(a => i.includes(a))),
    all:        lower,
  };
}

// ── CUISINE PROFILES ──────────────────────────────────────────
const CUISINES = {
  Italian: {
    spices:   ['dried oregano','fresh basil','black pepper','red chili flakes','bay leaves'],
    pantry:   ['olive oil','garlic','canned tomatoes','parmesan','white wine'],
    methods:  ['sauté','simmer','bake','roast'],
    dishes:   ['pasta','risotto','baked dish','pan sauce'],
    tip:      'Finish pasta in the sauce for 1–2 minutes so it absorbs the flavour.',
  },
  Indian: {
    spices:   ['cumin','turmeric','garam masala','coriander powder','chili powder','mustard seeds'],
    pantry:   ['ghee','onion','ginger','garlic','canned tomatoes','yogurt','fresh coriander'],
    methods:  ['temper','sauté','simmer','pressure cook'],
    dishes:   ['curry','dry sabzi','dal','biryani'],
    tip:      'Bloom the spices in hot oil or ghee for 30 seconds before adding anything else — this unlocks their full aroma.',
  },
  Japanese: {
    spices:   ['sesame oil','soy sauce','mirin','sake','white pepper'],
    pantry:   ['soy sauce','mirin','sesame oil','dashi','rice vinegar','nori'],
    methods:  ['stir-fry','steam','grill','simmer'],
    dishes:   ['stir-fry','donburi','miso soup','ramen'],
    tip:      'Add a splash of mirin at the end of cooking for a beautiful glaze and depth of flavour.',
  },
  Mexican: {
    spices:   ['cumin','smoked paprika','chili powder','oregano','coriander'],
    pantry:   ['olive oil','jalapeño','lime','cilantro','black beans','salsa'],
    methods:  ['sauté','grill','braise','bake'],
    dishes:   ['tacos','burrito filling','fajitas','enchilada filling'],
    tip:      'A squeeze of fresh lime just before serving brightens all the flavours dramatically.',
  },
  French: {
    spices:   ['herbes de Provence','thyme','tarragon','black pepper','bay leaf'],
    pantry:   ['butter','shallots','white wine','chicken stock','cream','Dijon mustard'],
    methods:  ['sauté','deglaze','braise','roast'],
    dishes:   ['pan sauce','gratin','stew','tart'],
    tip:      'Always deglaze the pan with wine or stock and scrape up the brown bits — that\'s where all the flavour is.',
  },
  'Middle Eastern': {
    spices:   ['cumin','coriander','cinnamon','allspice','sumac','za\'atar','turmeric'],
    pantry:   ['olive oil','lemon','garlic','tahini','pomegranate molasses','fresh parsley'],
    methods:  ['roast','grill','slow cook','sauté'],
    dishes:   ['roasted dish','pilaf','mezze','slow-cooked stew'],
    tip:      'Finish the dish with a drizzle of extra-virgin olive oil and fresh herbs just before serving.',
  },
  Thai: {
    spices:   ['fish sauce','chili','lemongrass','galangal','kaffir lime leaves'],
    pantry:   ['coconut milk','fish sauce','Thai basil','lime','palm sugar','soy sauce'],
    methods:  ['stir-fry','curry','steam','grill'],
    dishes:   ['stir-fry','curry','noodle dish','soup'],
    tip:      'Balance your dish with the four Thai pillars: salty (fish sauce), sweet (palm sugar), sour (lime), spicy (chili).',
  },
  American: {
    spices:   ['smoked paprika','garlic powder','onion powder','black pepper','cayenne'],
    pantry:   ['butter','vegetable oil','Worcestershire sauce','hot sauce','mustard'],
    methods:  ['grill','bake','pan-fry','roast'],
    dishes:   ['grilled dish','bake','casserole','pan-fried dish'],
    tip:      'Let meat rest for 5 minutes after cooking — the juices redistribute and every bite stays moist.',
  },
  Greek: {
    spices:   ['oregano','thyme','rosemary','cinnamon','black pepper'],
    pantry:   ['olive oil','lemon','garlic','feta','olives','fresh dill'],
    methods:  ['roast','grill','bake','sauté'],
    dishes:   ['roasted dish','salad','grilled dish','baked dish'],
    tip:      'Use good-quality extra-virgin olive oil generously — it\'s the backbone of Greek cooking.',
  },
  Chinese: {
    spices:   ['five-spice','white pepper','star anise','Sichuan peppercorn','sesame oil'],
    pantry:   ['soy sauce','oyster sauce','hoisin sauce','sesame oil','Shaoxing wine','cornstarch'],
    methods:  ['stir-fry','steam','braise','deep-fry'],
    dishes:   ['stir-fry','braised dish','steamed dish','fried rice'],
    tip:      'Keep your wok or pan very hot when stir-frying — that\'s the secret to "wok hei", the smoky restaurant flavour.',
  },
};

const DEFAULT_CUISINE = {
  spices:  ['black pepper','salt','olive oil','garlic powder'],
  pantry:  ['olive oil','garlic','onion','salt','pepper'],
  methods: ['sauté','roast','bake','simmer'],
  dishes:  ['sautéed dish','roasted dish','baked dish','stew'],
  tip:     'Taste and adjust seasoning just before serving for the best results.',
};

// ── HELPERS ───────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const copy = [...arr]; const out = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function servingScale(val, servings) {
  // Scale a base-2-servings quantity
  const ratio = servings / 2;
  if (typeof val === 'number') return Math.round(val * ratio * 10) / 10;
  return val;
}

// ── CALORIE ESTIMATION ────────────────────────────────────────
const CAL_MAP = {
  chicken: 165, beef: 250, pork: 242, lamb: 294, salmon: 208, tuna: 130,
  shrimp: 85, tofu: 76, paneer: 265, eggs: 155, egg: 155, lentils: 116,
  chickpeas: 164, pasta: 131, rice: 130, noodles: 138, bread: 265,
  potato: 77, cheese: 402, butter: 717, cream: 340, olive_oil: 120,
  default_protein: 180, default_veg: 35, default_grain: 120,
};
function estimateCalories(classified, servings) {
  let base = 0;
  for (const p of classified.proteins) {
    const key = Object.keys(CAL_MAP).find(k => p.includes(k)) || 'default_protein';
    base += CAL_MAP[key] * 0.18 * (servings / 2); // ~180g protein portion
  }
  for (const g of classified.grains) {
    base += CAL_MAP.default_grain * 1.2 * (servings / 2);
  }
  for (const v of classified.vegetables) {
    base += CAL_MAP.default_veg * 0.8;
  }
  for (const d of classified.dairy) {
    const key = Object.keys(CAL_MAP).find(k => d.includes(k));
    base += key ? CAL_MAP[key] * 0.08 : 60;
  }
  base += 80; // oil/seasoning base
  return Math.round(Math.max(250, Math.min(900, base)));
}

// ── RECIPE NAME GENERATOR ─────────────────────────────────────
function buildTitle(classified, cuisineName, dishType) {
  const adj = pick(['Golden','Pan-Seared','Rustic','Hearty','Fragrant','Crispy','Tender','Classic','Spiced','Herb-Roasted','Smoky','Zesty']);
  const main = classified.proteins[0] || classified.vegetables[0] || classified.grains[0] || 'Garden';
  const cName = cuisineName && cuisineName !== '' ? cuisineName + ' ' : '';
  return `${adj} ${cName}${cap(main)} ${cap(dishType)}`;
}

// ── STEP BUILDERS ──────────────────────────────────────────────
function prepSteps(classified, profile, skill) {
  const steps = [];

  // Step 1 – Mise en place
  const prepItems = [...classified.proteins, ...classified.vegetables].slice(0, 4);
  if (prepItems.length)
    steps.push(`Wash and prepare your ingredients: ${prepItems.map(cap).join(', ')}. ${classified.proteins.length ? 'Cut the protein into even-sized pieces to ensure uniform cooking.' : 'Chop vegetables into uniform pieces.'}`);

  // Step 2 – Heat fat
  const fat = classified.dairy.some(d => d.includes('butter') || d.includes('ghee'))
    ? (classified.dairy.find(d => d.includes('butter')) || classified.dairy.find(d => d.includes('ghee')))
    : profile.pantry[0] || 'olive oil';
  steps.push(`Heat ${fat} in a wide pan or skillet over medium-high heat until shimmering.`);

  return steps;
}

function aromaSteps(classified, profile) {
  const aromatics = classified.aromatics.length ? classified.aromatics : ['onion', 'garlic'];
  return [`Add ${aromatics.map(cap).join(' and ')} to the pan. Sauté for 2–3 minutes, stirring frequently, until softened and fragrant. ${pick(['The kitchen should smell incredible right now.', 'Don\'t let the garlic burn — reduce heat if needed.', 'This aromatic base is the foundation of all the flavour.'])}`];
}

function spiceSteps(profile) {
  const spices = pickN(profile.spices, 3);
  return [`Add ${spices.join(', ')}. Stir constantly for 30–45 seconds to toast the spices and bloom their aromas in the hot fat.`];
}

function proteinSteps(classified, skill, time) {
  if (!classified.proteins.length) return [];
  const protein = classified.proteins[0];
  const steps = [];

  steps.push(`Add the ${protein} to the pan in a single layer. ${skill === 'Beginner' ? 'Do not stir for 3–4 minutes so it can develop a golden crust.' : 'Sear undisturbed for 3–4 minutes per side until a deep golden crust forms.'} Season with salt and pepper.`);

  if (time > 40 && skill !== 'Beginner') {
    steps.push(`${pick(['Deglaze the pan with a splash of stock or water,', 'Add ¼ cup of liquid (stock, wine, or water)'])} scraping up any browned bits from the bottom — those carry enormous flavour. Stir to combine.`);
  }
  return steps;
}

function vegetableSteps(classified) {
  if (!classified.vegetables.length) return [];
  const vegs = classified.vegetables.slice(0, 3);
  return [`Add ${vegs.map(cap).join(', ')}. Toss to coat in the pan juices and cook for 4–5 minutes until just tender but still holding their shape.`];
}

function grainSteps(classified, servings) {
  if (!classified.grains.length) return [];
  const grain = classified.grains[0];
  if (grain.includes('rice')) {
    return [`Add ${servingScale(1, servings)} cup${servings > 2 ? 's' : ''} of rinsed rice and ${servingScale(1.5, servings)} cups${servings > 2 ? '' : ''} of water or stock. Bring to a boil, then cover and simmer on low heat for 18 minutes until the liquid is absorbed and the rice is fluffy.`];
  }
  if (grain.includes('pasta') || grain.includes('spaghetti') || grain.includes('penne')) {
    return [`Bring a large pot of well-salted water to a rolling boil. Cook ${grain} according to package instructions until al dente (usually 8–11 minutes). Reserve ½ cup of pasta water before draining.`];
  }
  if (grain.includes('noodles') || grain.includes('udon') || grain.includes('soba')) {
    return [`Cook ${grain} according to package directions. Drain, rinse under cold water to stop cooking, and set aside.`];
  }
  return [`Prepare the ${grain} according to package instructions. Season lightly with salt.`];
}

function liquidSteps(profile, time) {
  if (time < 30) return [];
  const liquid = pick(['½ cup of stock', 'a cup of canned tomatoes', '¾ cup coconut milk', 'a ladle of warm water']);
  return [`Pour in ${liquid}. Stir well, reduce heat to medium-low, and let everything simmer gently for ${Math.round(time * 0.35)}-${Math.round(time * 0.45)} minutes until the sauce thickens and the flavours meld beautifully.`];
}

function finishSteps(classified, profile, skill) {
  const steps = [];
  const fresh = pick(['a handful of fresh herbs','a squeeze of lemon','a drizzle of good olive oil','a pinch of flaky sea salt']);
  steps.push(`Taste and adjust seasoning — add salt, pepper, or a splash of acid as needed. Finish with ${fresh} for brightness.`);
  if (classified.dairy.length && !classified.dairy[0].includes('ghee')) {
    steps.push(`Remove from heat and stir in ${classified.dairy[0]} for a rich, glossy finish.`);
  }
  if (skill === 'Chef Level') {
    steps.push(`Plate elegantly: ${pick(['use a ring mould for a restaurant-style presentation', 'spoon a swoosh of sauce onto the plate first', 'layer components for height and visual interest'])}. Add ${pick(['microgreens','a drizzle of infused oil','edible flowers','toasted seeds'])} as a finishing garnish.`);
  } else {
    steps.push(`Serve hot, garnished with ${pick(['fresh parsley','fresh coriander','sliced spring onions','sesame seeds','a wedge of lemon'])}.`);
  }
  return steps;
}

// ── INGREDIENT LIST BUILDER ────────────────────────────────────
function buildIngredientList(userIngredients, classified, profile, servings, diets) {
  const list = [];

  // User's own ingredients first with quantities
  for (const ing of userIngredients) {
    const low = ing.toLowerCase();
    let qty = '';
    if (PROTEINS.some(p => low.includes(p)))       qty = `${servingScale(200, servings)}g `;
    else if (GRAINS.some(g => low.includes(g)))     qty = `${servingScale(1, servings)} cup `;
    else if (VEGETABLES.some(v => low.includes(v))) qty = `${servingScale(1, servings)} medium `;
    else if (DAIRY.some(d => low.includes(d)))      qty = `${servingScale(2, servings)} tbsp `;
    list.push(`${qty}${ing}${diets.includes('Vegan') && DAIRY.some(d => low.includes(d)) ? ' (use plant-based alternative)' : ''}`);
  }

  // Add pantry staples from cuisine profile (filter duplicates)
  const existing = userIngredients.map(i => i.toLowerCase());
  const extras = profile.pantry.filter(p => !existing.some(e => e.includes(p.toLowerCase())));
  const toAdd = pickN(extras, 3);
  for (const e of toAdd) {
    const low = e.toLowerCase();
    let qty = '2 tbsp ';
    if (low.includes('oil')) qty = '2 tbsp ';
    else if (low.includes('stock') || low.includes('wine')) qty = '½ cup ';
    else if (low.includes('cream') || low.includes('milk') || low.includes('coconut')) qty = '¾ cup ';
    else if (low.includes('sauce')) qty = '1 tbsp ';
    list.push(`${qty}${e}`);
  }

  // Add spices
  const spices = pickN(profile.spices, 2);
  for (const s of spices) list.push(`½ tsp ${s}`);

  // Always add salt & pepper if not present
  if (!existing.some(e => e.includes('salt'))) list.push('Salt and freshly ground black pepper, to taste');

  return list;
}

// ── MAIN EXPORT ───────────────────────────────────────────────
function generateRecipe({ ingredients, cuisine, diets = [], cookingTime = 45, servings = 2, skill = 'Intermediate' }) {
  const userIngredients = ingredients
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const classified = classify(userIngredients);
  const profile    = CUISINES[cuisine] || DEFAULT_CUISINE;
  const cuisineName = cuisine || '';
  const dishType   = pick(profile.dishes);
  const time       = Number(cookingTime) || 45;
  const sv         = Number(servings) || 2;

  // Adjust prep/cook times
  const prepMin = Math.max(5, Math.round(time * 0.28));
  const cookMin = time - prepMin;

  // Build steps
  const allSteps = [
    ...prepSteps(classified, profile, skill),
    ...aromaSteps(classified, profile),
    ...spiceSteps(profile),
    ...proteinSteps(classified, skill, time),
    ...vegetableSteps(classified),
    ...grainSteps(classified, sv),
    ...liquidSteps(profile, time),
    ...finishSteps(classified, profile, skill),
  ].filter(Boolean);

  const recipe = {
    title:       buildTitle(classified, cuisineName, dishType),
    cuisine:     cuisineName || 'World',
    prepTime:    `${prepMin} min`,
    cookTime:    `${cookMin} min`,
    servings:    sv,
    calories:    estimateCalories(classified, sv),
    difficulty:  skill === 'Chef Level' ? 'Advanced' : skill,
    ingredients: buildIngredientList(userIngredients, classified, profile, sv, diets),
    steps:       allSteps,
    chefTip:     profile.tip,
  };

  return recipe;
}

module.exports = generateRecipe;
