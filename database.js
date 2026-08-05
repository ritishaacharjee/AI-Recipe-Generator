// Uses Node.js 24 built-in node:sqlite — no native compilation needed!
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'chefmind.db');
const db = new DatabaseSync(DB_PATH);

// Performance & integrity settings
db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

// ── SCHEMA ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    is_admin      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    cuisine     TEXT    DEFAULT '',
    prep_time   TEXT    DEFAULT '',
    cook_time   TEXT    DEFAULT '',
    servings    INTEGER DEFAULT 2,
    calories    INTEGER DEFAULT 0,
    difficulty  TEXT    DEFAULT '',
    ingredients TEXT    NOT NULL DEFAULT '[]',
    steps       TEXT    NOT NULL DEFAULT '[]',
    chef_tip    TEXT    DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);

  CREATE TABLE IF NOT EXISTS search_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query         TEXT    NOT NULL,
    search_type   TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_history_user ON search_history(user_id);
`);

// ── PREPARED STATEMENTS ───────────────────────────────────────
// Automatically add is_admin column if it doesn't exist (for existing DBs)
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;`);
} catch (e) {
  // Column likely already exists, ignore
}

const stmts = {
  // Users
  createUser: db.prepare(
    `INSERT INTO users (username, email, password_hash, is_admin) VALUES (:username, :email, :password_hash, :is_admin)`
  ),
  getUserByEmail:    db.prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`),
  getUserByUsername: db.prepare(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`),
  getUserById:       db.prepare(`SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?`),

  // Recipes
  saveRecipe: db.prepare(`
    INSERT INTO recipes
      (user_id, title, cuisine, prep_time, cook_time, servings, calories, difficulty, ingredients, steps, chef_tip)
    VALUES
      (:user_id, :title, :cuisine, :prep_time, :cook_time, :servings, :calories, :difficulty, :ingredients, :steps, :chef_tip)
  `),
  getRecipesByUser: db.prepare(
    `SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC`
  ),
  getRecipeById: db.prepare(
    `SELECT * FROM recipes WHERE id = ? AND user_id = ?`
  ),
  deleteRecipe: db.prepare(
    `DELETE FROM recipes WHERE id = ? AND user_id = ?`
  ),
  countRecipesByUser: db.prepare(
    `SELECT COUNT(*) as count FROM recipes WHERE user_id = ?`
  ),

  // Search History
  saveHistory: db.prepare(`
    INSERT INTO search_history (user_id, query, search_type)
    VALUES (:user_id, :query, :search_type)
  `),
  getHistoryByUser: db.prepare(`
    SELECT id, query, search_type, created_at 
    FROM search_history 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `),
  deleteOldHistory: db.prepare(`
    DELETE FROM search_history 
    WHERE created_at < datetime('now', '-30 days')
  `),

  // Admin Stats
  countUsers: db.prepare(`SELECT COUNT(*) as total FROM users`),
  countRecipes: db.prepare(`SELECT COUNT(*) as total FROM recipes`),
  countSearches: db.prepare(`SELECT COUNT(*) as total FROM search_history`),
  getRecentUsers: db.prepare(`
    SELECT id, username, email, created_at 
    FROM users ORDER BY created_at DESC LIMIT 10
  `),
  getRecentSearches: db.prepare(`
    SELECT query, search_type, created_at 
    FROM search_history ORDER BY created_at DESC LIMIT 10
  `),
};

module.exports = { db, stmts };
