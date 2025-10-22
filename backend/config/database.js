const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inspirelens',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00'
};

const connectDB = async () => {
  try {
    pool = mysql.createPool(dbConfig);
    
    // Test connection
    const connection = await pool.getConnection();
    logger.info('MySQL connected successfully');
    connection.release();
    
    // Initialize database schema
    await initializeSchema();
    
    return pool;
  } catch (error) {
    logger.error('MySQL connection failed:', error);
    throw error;
  }
};

const initializeSchema = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        first_name VARCHAR(100),
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255),
        google_id VARCHAR(255),
        user_type ENUM('local', 'google') DEFAULT 'local',
        display_mode ENUM('light', 'dark', 'system') DEFAULT 'light',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_google_id (google_id),
        INDEX idx_deleted_created (is_deleted, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL,
        slug VARCHAR(50) NOT NULL UNIQUE,
        icon VARCHAR(10),
        color VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        INDEX idx_slug (slug),
        INDEX idx_name (name),
        INDEX idx_deleted (is_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert default categories
    await connection.execute(`
      INSERT IGNORE INTO categories (name, slug, icon, color) VALUES
      ('All', 'all', '🌟', 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700'),
      ('Mindset', 'mindset', '🧠', 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600'),
      ('Productivity', 'productivity', '⚡', 'bg-slate-300 hover:bg-slate-400 text-slate-900 dark:bg-slate-500'),
      ('Leadership', 'leadership', '👑', 'bg-slate-400 hover:bg-slate-500 text-white dark:bg-slate-400'),
      ('Learning', 'learning', '📚', 'bg-slate-500 hover:bg-slate-600 text-white dark:bg-slate-300'),
      ('Wellbeing', 'wellbeing', '🌿', 'bg-slate-600 hover:bg-slate-700 text-white dark:bg-slate-200'),
      ('Spirituality', 'spirituality', '🙏', 'bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-100'),
      ('Relationship', 'relationship', '💝', 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-50'),
      ('Career', 'career', '🚀', 'bg-slate-900 hover:bg-black text-white dark:bg-white')
    `);



    connection.release();
    logger.info('MySQL schema initialized successfully');
  } catch (error) {
    logger.error('MySQL schema initialization failed:', error);
    throw error;
  }
};

const getDB = () => {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
};

module.exports = { connectDB, getDB };