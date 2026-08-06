const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Initialize Schema
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(255) NOT NULL UNIQUE,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_admin      INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       VARCHAR(255) NOT NULL,
      cuisine     VARCHAR(255) DEFAULT '',
      prep_time   VARCHAR(255) DEFAULT '',
      cook_time   VARCHAR(255) DEFAULT '',
      servings    INTEGER DEFAULT 2,
      calories    INTEGER DEFAULT 0,
      difficulty  VARCHAR(255) DEFAULT '',
      ingredients TEXT    NOT NULL DEFAULT '[]',
      steps       TEXT    NOT NULL DEFAULT '[]',
      chef_tip    TEXT    DEFAULT '',
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);

    CREATE TABLE IF NOT EXISTS search_history (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      query         TEXT    NOT NULL,
      search_type   VARCHAR(255) NOT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_history_user ON search_history(user_id);
    
    -- Table for connect-pg-simple sessions
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    ) WITH (OIDS=FALSE);
    
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT VALID;
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `).catch(err => {
    console.error('CRITICAL: Database initialization failed:', err);
  });
};

initDb();

const db = {
  // Users
  async createUser(username, email, password_hash, is_admin = 0) {
    const res = await pool.query(
      `INSERT INTO users (username, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *`,
      [username, email, password_hash, is_admin]
    );
    return res.rows[0];
  },
  async getUserByEmail(email) {
    const res = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return res.rows[0];
  },
  async getUserByUsername(username) {
    const res = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
    return res.rows[0];
  },
  async getUserById(id) {
    const res = await pool.query(`SELECT id, username, email, is_admin, created_at FROM users WHERE id = $1`, [id]);
    return res.rows[0];
  },

  // Recipes
  async saveRecipe(user_id, title, cuisine, prep_time, cook_time, servings, calories, difficulty, ingredients, steps, chef_tip) {
    const res = await pool.query(`
      INSERT INTO recipes
        (user_id, title, cuisine, prep_time, cook_time, servings, calories, difficulty, ingredients, steps, chef_tip)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `, [user_id, title, cuisine, prep_time, cook_time, servings, calories, difficulty, ingredients, steps, chef_tip]);
    return res.rows[0];
  },
  async getRecipesByUser(user_id) {
    const res = await pool.query(`SELECT * FROM recipes WHERE user_id = $1 ORDER BY created_at DESC`, [user_id]);
    return res.rows;
  },
  async getRecipeById(id, user_id) {
    const res = await pool.query(`SELECT * FROM recipes WHERE id = $1 AND user_id = $2`, [id, user_id]);
    return res.rows[0];
  },
  async deleteRecipe(id, user_id) {
    await pool.query(`DELETE FROM recipes WHERE id = $1 AND user_id = $2`, [id, user_id]);
  },
  async countRecipesByUser(user_id) {
    const res = await pool.query(`SELECT COUNT(*) as count FROM recipes WHERE user_id = $1`, [user_id]);
    return res.rows[0];
  },

  // Search History
  async saveHistory(user_id, query, search_type) {
    const res = await pool.query(`
      INSERT INTO search_history (user_id, query, search_type)
      VALUES ($1, $2, $3) RETURNING *
    `, [user_id, query, search_type]);
    return res.rows[0];
  },
  async getHistoryByUser(user_id) {
    const res = await pool.query(`
      SELECT id, query, search_type, created_at 
      FROM search_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [user_id]);
    return res.rows;
  },
  async deleteOldHistory() {
    await pool.query(`DELETE FROM search_history WHERE created_at < NOW() - INTERVAL '30 days'`);
  },

  // Admin Stats
  async countUsers() {
    const res = await pool.query(`SELECT COUNT(*) as total FROM users`);
    return res.rows[0];
  },
  async countRecipes() {
    const res = await pool.query(`SELECT COUNT(*) as total FROM recipes`);
    return res.rows[0];
  },
  async countSearches() {
    const res = await pool.query(`SELECT COUNT(*) as total FROM search_history`);
    return res.rows[0];
  },
  async getRecentUsers() {
    const res = await pool.query(`
      SELECT id, username, email, created_at 
      FROM users ORDER BY created_at DESC LIMIT 10
    `);
    return res.rows;
  },
  async getRecentSearches() {
    const res = await pool.query(`
      SELECT query, search_type, created_at 
      FROM search_history ORDER BY created_at DESC LIMIT 10
    `);
    return res.rows;
  }
};

module.exports = { pool, db };
