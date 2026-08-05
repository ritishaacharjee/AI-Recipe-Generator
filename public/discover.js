/* ═══════════════════════════════════════════════════════════
   CHEFMIND — DISCOVER.JS
   Handles: Dish Lookup, Place Discovery (carousel), Mood & Weather
   ═══════════════════════════════════════════════════════════ */
'use strict';

// ─────────────────────────────────────────────────────────────
// SHARED UTILITIES
// ─────────────────────────────────────────────────────────────
function buildShimmer() {
  return `<div>
    <div class="shimmer shimmer-line" style="width:55%;height:28px;margin-bottom:1rem"></div>
    <div class="shimmer shimmer-line" style="width:25%;height:14px;margin-bottom:1.5rem"></div>
    <div class="shimmer shimmer-line" style="width:100%;height:56px;margin-bottom:1.5rem"></div>
    <div class="shimmer shimmer-line" style="width:40%;height:11px"></div>
    <div class="shimmer shimmer-line" style="width:100%;height:10px"></div>
    <div class="shimmer shimmer-line" style="width:88%;height:10px"></div>
    <div class="shimmer shimmer-line" style="width:40%;height:11px;margin-top:1rem"></div>
    <div class="shimmer shimmer-line" style="width:100%;height:10px"></div>
    <div class="shimmer shimmer-line" style="width:78%;height:10px"></div>
  </div>`;
}

function buildRecipeHTML(r, saveBtn = true) {
  const ings  = (r.ingredients || []).map(i => `<li>${i}</li>`).join('');
  const steps = (r.steps || []).map((s, i) => `
    <li class="step-item">
      <div class="step-num">0${i + 1}</div>
      <div class="step-text">${s}</div>
    </li>`).join('');
  const rData = JSON.stringify(r).replace(/'/g, '&apos;');
  return `
    <div class="recipe-title">${r.title}</div>
    <div class="recipe-cuisine-tag">${r.cuisine || ''}</div>
    <div class="recipe-meta">
      <div class="meta-item"><div class="meta-val">${r.prepTime||'—'}</div><div class="meta-key">Prep</div></div>
      <div class="meta-item"><div class="meta-val">${r.cookTime||'—'}</div><div class="meta-key">Cook</div></div>
      <div class="meta-item"><div class="meta-val">${r.calories}</div><div class="meta-key">Calories</div></div>
      <div class="meta-item"><div class="meta-val">${r.servings}</div><div class="meta-key">Serves</div></div>
    </div>
    <div class="recipe-section-title">Ingredients (for ${r.servings} ${r.servings > 1 ? 'people' : 'person'})</div>
    <ul class="ingredients-list">${ings}</ul>
    <div class="recipe-section-title">Method</div>
    <ol class="steps-list">${steps}</ol>
    ${r.chefTip ? `<div class="chef-tip">👨‍🍳 Chef's Tip: ${r.chefTip}</div>` : ''}
    ${saveBtn ? `<div class="recipe-actions" style="margin-top:1.5rem">
      <button class="action-btn" onclick="saveDiscoveredRecipe(this)" data-recipe='${rData}'>♥ Save</button>
    </div>` : ''}`;
}

async function saveDiscoveredRecipe(btn) {
  const r = JSON.parse(btn.dataset.recipe.replace(/&apos;/g, "'"));
  if (!window.currentUser) { if (window.openAuthModal) openAuthModal('login'); return; }
  btn.disabled = true;
  try {
    const res = await fetch('/api/recipes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Save failed');
    btn.textContent = '✓ Saved'; btn.classList.add('saved-ok');
    if (window.showToast) showToast('Recipe saved to your collection ✦');
    if (window.loadFavorites) loadFavorites();
  } catch (e) {
    btn.disabled = false;
    if (window.showToast) showToast(e.message, 'red');
  }
}
window.saveDiscoveredRecipe = saveDiscoveredRecipe;

// ─────────────────────────────────────────────────────────────
// RECIPE MODAL (shared, for mood section)
// ─────────────────────────────────────────────────────────────
function openRecipeModal(html) {
  document.getElementById('recipe-modal-body').innerHTML = html;
  document.getElementById('recipe-detail-modal').classList.add('open');
}
function closeMoodModal() {
  document.getElementById('recipe-detail-modal').classList.remove('open');
}
window.closeMoodModal = closeMoodModal;

// ═══════════════════════════════════════════════════════════════
// 1. DISH LOOKUP
// ═══════════════════════════════════════════════════════════════
async function lookupDish() {
  const dishName = document.getElementById('dish-name').value.trim();
  if (!dishName) { if (window.showToast) showToast('Please enter a dish name', 'red'); return; }

  const people = parseInt(document.getElementById('dish-people').value) || 2;
  const diets  = [...document.querySelectorAll('#dish-diet-tags .tag.active')].map(t => t.dataset.val);
  const skill  = document.querySelector('#dish-skill-tags .tag.active')?.dataset.val || 'Intermediate';

  const btn = document.getElementById('dish-btn');
  btn.classList.add('loading'); btn.disabled = true;
  document.getElementById('dish-output').innerHTML = buildShimmer();

  try {
    const res  = await fetch('/api/discover/dish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishName, people, diets, skill }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    const { recipe, found } = data;
    document.getElementById('dish-output').innerHTML =
      (!found ? `<div class="disc-not-found"><strong>✦ Close match found</strong>We generated a recipe inspired by "${dishName}" using similar ingredients.</div>` : '') +
      buildRecipeHTML(recipe, true);
  } catch (e) {
    document.getElementById('dish-output').innerHTML =
      `<div class="disc-error"><strong>Not Found</strong><br>${e.message}</div>`;
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}
window.lookupDish = lookupDish;

// ═══════════════════════════════════════════════════════════════
// 2. PLACE DISCOVERY — CAROUSEL
// ═══════════════════════════════════════════════════════════════

// How many cards are visible at one time (CSS must match)
function cardsPerView() {
  const w = window.innerWidth;
  if (w <= 580)  return 1;
  if (w <= 900)  return 2;
  return 3;
}

const placeCarousel = {
  dishes:    [],    // full array of dish cards
  page:      0,     // current page index (each page = cardsPerView() items)
  activeDish: null, // key of the currently expanded dish
};

async function discoverPlace(presetPlace) {
  const inputEl = document.getElementById('place-input');
  const q = presetPlace || inputEl?.value?.trim();
  if (!q) { if (window.showToast) showToast('Enter a place name', 'red'); return; }
  if (inputEl) inputEl.value = q;

  const btn    = document.getElementById('place-btn');
  const out    = document.getElementById('place-output');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  out.innerHTML = `<div style="padding:2rem">${buildShimmer()}</div>`;

  try {
    const res  = await fetch('/api/discover/place', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place: q }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    renderPlaceResult(data);
  } catch (e) {
    out.innerHTML = `<div class="disc-error"><strong>Not Found</strong><br>${e.message}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Discover'; }
  }
}
window.discoverPlace = discoverPlace;

function renderPlaceResult({ place, dishes }) {
  // Reset carousel state
  placeCarousel.dishes    = dishes;
  placeCarousel.page      = 0;
  placeCarousel.activeDish = null;

  const out = document.getElementById('place-output');
  out.innerHTML = `
    <div class="place-result-header">
      <div class="place-result-name">${place.display}</div>
      <div class="place-result-desc">${place.description}</div>
    </div>
    <div class="carousel-shell" id="place-carousel-shell">
      <div class="carousel-rail" id="place-rail"></div>
    </div>
    <div class="recipe-panel" id="place-recipe-panel">
      <div class="panel-close-row">
        <h3 id="place-panel-title">Recipe</h3>
        <button class="panel-close" onclick="closePlacePanel()">✕ Close</button>
      </div>
      <div id="place-panel-body"></div>
    </div>
    <div class="carousel-nav" id="place-carousel-nav"></div>`;

  buildCarouselRail();
  updateCarouselNav();
}

function buildCarouselRail() {
  const rail   = document.getElementById('place-rail');
  const dishes = placeCarousel.dishes;

  rail.innerHTML = dishes.map((d, i) => `
    <div class="carousel-card" id="cc-${i}" data-key="${d.key}" data-idx="${i}">
      <div class="cc-cuisine">${d.cuisine}</div>
      <div class="cc-name">${d.name}</div>
      <div class="cc-desc">${d.description}</div>
      <button class="cc-btn" onclick="loadPlaceRecipe(${i})">
        Full Recipe <span class="see-more-arrow">→</span>
      </button>
    </div>`).join('');

  slideTo(0, false); // snap without animation on first render
}

function slideTo(page, animate = true) {
  const rail = document.getElementById('place-rail');
  if (!rail) return;
  const cpv  = cardsPerView();
  const maxP = Math.max(0, Math.ceil(placeCarousel.dishes.length / cpv) - 1);
  page = Math.max(0, Math.min(page, maxP));
  placeCarousel.page = page;

  rail.style.transition = animate ? 'transform .45s cubic-bezier(.25,.46,.45,.94)' : 'none';
  // Move the rail exactly 'page' container widths
  rail.style.transform  = `translateX(-${page * 100}%)`;

  // Ensure each card takes exactly 1/cpv of the container width
  const cardPct = 100 / cpv;
  [...rail.children].forEach(c => { c.style.flex = `0 0 ${cardPct}%`; });

  updateCarouselNav();
}

function updateCarouselNav() {
  const nav    = document.getElementById('place-carousel-nav');
  if (!nav) return;
  const cpv    = cardsPerView();
  const total  = placeCarousel.dishes.length;
  const maxP   = Math.max(0, Math.ceil(total / cpv) - 1);
  const page   = placeCarousel.page;
  const start  = page * cpv + 1;
  const end    = Math.min(start + cpv - 1, total);

  nav.innerHTML = `
    <span class="carousel-counter">Showing <strong>${start}–${end}</strong> of <strong>${total}</strong> dishes</span>
    <button class="carousel-arrow" onclick="slideTo(${page - 1})" ${page === 0 ? 'disabled' : ''} title="Previous">&#8592;</button>
    <button class="see-more-btn" onclick="slideTo(${page + 1})" ${page >= maxP ? 'disabled' : ''}>
      See More <span class="see-more-arrow">→</span>
    </button>
    <button class="carousel-arrow" onclick="slideTo(${page + 1})" ${page >= maxP ? 'disabled' : ''} title="Next">&#8594;</button>`;
}

// ── Load full recipe for a place card ───────────────────────
async function loadPlaceRecipe(idx) {
  const dish = placeCarousel.dishes[idx];
  if (!dish) return;

  // If same card, toggle close
  const panel = document.getElementById('place-recipe-panel');
  if (placeCarousel.activeDish === dish.key && panel.classList.contains('open')) {
    closePlacePanel(); return;
  }
  placeCarousel.activeDish = dish.key;

  // Show spinner on card
  const cardEl = document.getElementById(`cc-${idx}`);
  const loader = document.createElement('div');
  loader.className = 'cc-loading'; loader.innerHTML = '⟳';
  if (cardEl) cardEl.appendChild(loader);

  // Show panel with shimmer
  panel.classList.add('open');
  document.getElementById('place-panel-title').textContent = dish.name;
  document.getElementById('place-panel-body').innerHTML = buildShimmer();
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    const res  = await fetch('/api/discover/dish-recipe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishKey: dish.key, people: 2, diets: [], skill: 'Intermediate' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    document.getElementById('place-panel-body').innerHTML = buildRecipeHTML(data.recipe, true);
  } catch (e) {
    document.getElementById('place-panel-body').innerHTML =
      `<div class="disc-error">${e.message}</div>`;
  } finally {
    if (cardEl) { const l = cardEl.querySelector('.cc-loading'); if (l) l.remove(); }
  }
}
window.loadPlaceRecipe = loadPlaceRecipe;

function closePlacePanel() {
  const panel = document.getElementById('place-recipe-panel');
  if (panel) panel.classList.remove('open');
  placeCarousel.activeDish = null;
}
window.closePlacePanel = closePlacePanel;

// Re-render on resize so card width stays correct
let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (placeCarousel.dishes.length) slideTo(placeCarousel.page, false);
  }, 200);
});

// ── AUTOCOMPLETE LOGIC FOR PLACE INPUT ─────────────────────
let placeListCache = [];
let activeSuggestionIndex = -1;

async function initPlaceAutocomplete() {
  const inp = document.getElementById('place-input');
  const dropdown = document.getElementById('place-autocomplete-dropdown');
  if (!inp || !dropdown) return;

  try {
    const res = await fetch('/api/discover/places');
    placeListCache = await res.json();
  } catch (e) {
    console.error('Failed to load places for autocomplete', e);
  }

  function renderSuggestions(query) {
    if (!query) {
      dropdown.classList.add('hidden');
      return;
    }
    const qLower = query.toLowerCase();
    
    // Filter places
    const matches = placeListCache.filter(p => p.display.toLowerCase().includes(qLower));
    
    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="autocomplete-item" style="color:var(--muted); cursor:default;">No matching location found.</div>`;
      dropdown.classList.remove('hidden');
      activeSuggestionIndex = -1;
      return;
    }
    
    activeSuggestionIndex = -1;
    dropdown.innerHTML = matches.map((m, idx) => {
      // Escape HTML and highlight match
      const escapedDisplay = m.display.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const highlighted = escapedDisplay.replace(regex, `<span class="highlight">$1</span>`);
      
      return `<div class="autocomplete-item suggestion-item" data-idx="${idx}" data-val="${escapedDisplay.replace(/"/g, '&quot;')}">${highlighted}</div>`;
    }).join('');
    
    dropdown.classList.remove('hidden');
    
    // Bind clicks & hovers
    dropdown.querySelectorAll('.suggestion-item').forEach(el => {
      el.addEventListener('click', (e) => {
        inp.value = el.dataset.val;
        dropdown.classList.add('hidden');
        inp.focus();
      });
      el.addEventListener('mouseenter', () => {
        updateActiveSuggestion(parseInt(el.dataset.idx));
      });
    });
  }

  function updateActiveSuggestion(index) {
    const items = dropdown.querySelectorAll('.suggestion-item');
    if (!items.length) return;
    
    items.forEach(el => el.classList.remove('active'));
    if (index >= 0 && index < items.length) {
      activeSuggestionIndex = index;
      items[index].classList.add('active');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }

  inp.addEventListener('input', (e) => {
    renderSuggestions(e.target.value.trim());
  });
  
  inp.addEventListener('focus', () => {
    if (inp.value.trim()) renderSuggestions(inp.value.trim());
  });

  inp.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('.suggestion-item');
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!dropdown.classList.contains('hidden') && activeSuggestionIndex >= 0 && items.length) {
         inp.value = items[activeSuggestionIndex].dataset.val;
         dropdown.classList.add('hidden');
      } else {
         discoverPlace();
         dropdown.classList.add('hidden');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!dropdown.classList.contains('hidden') && items.length) {
        updateActiveSuggestion((activeSuggestionIndex + 1) % items.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!dropdown.classList.contains('hidden') && items.length) {
        updateActiveSuggestion(activeSuggestionIndex <= 0 ? items.length - 1 : activeSuggestionIndex - 1);
      }
    } else if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!inp.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initPlaceAutocomplete();
  initDishTags();
  initWeatherCuisine();

  // Close modal on overlay click
  const modal = document.getElementById('recipe-detail-modal');
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeMoodModal(); });
});

// Enter key on dish input
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('dish-name');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') lookupDish(); });
});
// ── HISTORY SIDE PANEL ───────────────────────────────────────
async function openHistoryPanel(e) {
  if (e) e.preventDefault();
  const panel = document.getElementById('history-panel');
  const body = document.getElementById('history-body');
  if (!panel || !body) return;
  
  panel.classList.add('open');
  body.innerHTML = `<div class="history-empty">Loading history...</div>`;

  try {
    const res = await fetch('/api/discover/history');
    if (res.status === 401) {
      body.innerHTML = `<div class="history-empty">Please log in to view your search history.</div>`;
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    if (!data.history || data.history.length === 0) {
      body.innerHTML = `<div class="history-empty">No recent searches found.</div>`;
      return;
    }

    body.innerHTML = data.history.map(item => {
      const date = new Date(item.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="history-item" onclick="triggerHistorySearch('${item.search_type}', '${item.query.replace(/'/g, "\\'")}')">
          <div class="history-type">${item.search_type} search</div>
          <div class="history-query">${item.query}</div>
          <div class="history-date">${date}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    body.innerHTML = `<div class="history-empty" style="color:#e06b6b">Could not load history.</div>`;
  }
}
window.openHistoryPanel = openHistoryPanel;

function closeHistoryPanel() {
  const panel = document.getElementById('history-panel');
  if (panel) panel.classList.remove('open');
}
window.closeHistoryPanel = closeHistoryPanel;

function triggerHistorySearch(type, query) {
  closeHistoryPanel();
  if (type === 'dish') {
    const el = document.getElementById('dish-name');
    if (el) el.value = query;
    lookupDish(query);
    document.getElementById('generator')?.scrollIntoView();
  } else if (type === 'place') {
    const el = document.getElementById('place-input');
    if (el) el.value = query;
    discoverPlace(query);
    document.getElementById('place-discovery')?.scrollIntoView();
  } else if (type === 'mood') {
    const parts = query.split(' & ');
    let w = '', m = '';
    // Mood/Weather pills use data-w and data-m
    // For simplicity, just try to match text or just set it based on parts.
    // The query string is constructed as [weather, mood].filter(Boolean).join(' & ')
    if (parts.length === 2) { w = parts[0]; m = parts[1]; }
    else if (parts.length === 1) {
      // Is it weather or mood?
      if (document.querySelector(`.weather-pill[data-w="${parts[0]}"]`)) w = parts[0];
      else m = parts[0];
    }
    window.selWeather = w;
    window.selCuisine = m;
    
    document.querySelectorAll('.weather-pill').forEach(x => {
      x.classList.toggle('active', x.dataset.w === w);
    });
    document.querySelectorAll('.cuisine-pill').forEach(x => {
      x.classList.toggle('active', x.dataset.c === m);
    });
    
    suggestFood();
    document.getElementById('mood-food')?.scrollIntoView();
  }
}
window.triggerHistorySearch = triggerHistorySearch;
function initDishTags() {
  document.querySelectorAll('#dish-diet-tags .tag').forEach(t =>
    t.addEventListener('click', () => t.classList.toggle('active')));
  document.querySelectorAll('#dish-skill-tags .tag').forEach(t =>
    t.addEventListener('click', () => {
      document.querySelectorAll('#dish-skill-tags .tag').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
    }));
}

// ═══════════════════════════════════════════════════════════════
// 3. WEATHER & CUISINE
// ─────────────────────────────────────────────────────────────
let selWeather = '';
let selCuisine = '';

function initWeatherCuisine() {
  document.querySelectorAll('.weather-pill').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.weather-pill').forEach(x => x.classList.remove('active'));
      selWeather = el.dataset.w === selWeather ? '' : el.dataset.w;
      if (selWeather) el.classList.add('active');
    });
  });

  document.querySelectorAll('.cuisine-pill').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.cuisine-pill').forEach(x => x.classList.remove('active'));
      selCuisine = el.dataset.c === selCuisine ? '' : el.dataset.c;
      if (selCuisine) el.classList.add('active');
    });
  });
}

async function suggestFood() {
  if (!selWeather && !selCuisine) {
    if (window.showToast) showToast('Pick a weather or cuisine first', 'red'); return;
  }
  const btn = document.getElementById('mood-btn');
  btn.classList.add('loading');
  document.getElementById('mood-output').innerHTML = buildShimmer();

  try {
    const res  = await fetch('/api/discover/weather-cuisine', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weather: selWeather, cuisine: selCuisine }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    renderCuisineResults(data);
  } catch (e) {
    document.getElementById('mood-output').innerHTML =
      `<div class="disc-error">${e.message}</div>`;
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}
window.suggestFood = suggestFood;

function renderCuisineResults({ weather, cuisine, dishes }) {
  window._moodDishes = dishes;
  const out = document.getElementById('mood-output');
  const itemsHTML = dishes.map((d, i) => `
    <div class="mood-dish-item">
      <div>
        <div class="mood-dish-name">${d.name}</div>
        <div class="mood-dish-meta">${d.cuisine}</div>
      </div>
      <button class="btn-view-recipe" id="mood-btn-${i}" onclick="loadMoodRecipe(${i})">
        Full Recipe →
      </button>
    </div>`).join('');

  out.innerHTML = `
    <div class="mood-result-header">
      <div class="mood-result-title">
        ${weather ? weather.label : ''}${weather && cuisine ? ' & ' : ''}${cuisine ? cuisine.label : ''}
      </div>
      <div class="mood-result-desc">${weather?.description || 'Food for this moment.'}</div>
    </div>
    <div class="mood-dishes-list">${itemsHTML}</div>`;
}

async function loadMoodRecipe(idx) {
  const d   = window._moodDishes?.[idx];
  if (!d) return;
  const btn = document.getElementById(`mood-btn-${idx}`);
  if (btn) { btn.textContent = '…'; btn.classList.add('loading-recipe'); btn.disabled = true; }

  openRecipeModal(buildShimmer());

  try {
    const res  = await fetch('/api/discover/dish-recipe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishKey: d.key, people: 2, diets: [], skill: 'Intermediate' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    openRecipeModal(buildRecipeHTML(data.recipe, true));
  } catch (e) {
    openRecipeModal(`<div class="disc-error">${e.message}</div>`);
  } finally {
    if (btn) { btn.textContent = 'Full Recipe →'; btn.classList.remove('loading-recipe'); btn.disabled = false; }
  }
}
window.loadMoodRecipe = loadMoodRecipe;

// ═══════════════════════════════════════════════════════════════
// 4. MEAL PLANNER
// ─────────────────────────────────────────────────────────────
async function generateMealPlan() {
  const btn = document.getElementById('btn-generate-mealplan');
  const out = document.getElementById('mealplan-output');
  const cal = document.getElementById('planner-calendar-container');

  btn.classList.add('loading'); btn.disabled = true;
  if (cal) cal.style.opacity = '0.5';

  try {
    const res = await fetch('/api/generate/mealplan', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate plan');

    window._mealPlan = data.mealPlan;
    
    const itemsHTML = data.mealPlan.map((m, i) => `
      <div class="meal-card">
        <div class="meal-day">${m.day}</div>
        <div class="meal-name">${m.recipe.title}</div>
        <div class="meal-meta">${m.recipe.cuisine || 'Global'} · ${m.recipe.cookTime || '45 min'}</div>
        <button class="meal-recipe-btn" onclick="loadMealPlanRecipe(${i})">View Recipe →</button>
      </div>
    `).join('');

    if (cal) cal.style.display = 'none';
    out.style.display = 'block';
    out.innerHTML = `
      <div class="section-tag" style="margin-bottom:1rem">Your 7-Day Plan</div>
      <div class="mealplan-grid">${itemsHTML}</div>
    `;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    if (window.showToast) showToast(err.message, 'red');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
    if (cal) cal.style.opacity = '1';
  }
}
window.generateMealPlan = generateMealPlan;

function loadMealPlanRecipe(idx) {
  if (!window._mealPlan) return;
  const plan = window._mealPlan[idx];
  if (plan && plan.recipe) {
    openRecipeModal(buildRecipeHTML(plan.recipe, true));
  }
}
window.loadMealPlanRecipe = loadMealPlanRecipe;
