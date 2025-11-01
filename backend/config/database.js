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
    // logger.info('MySQL connected successfully');
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



    // Quotes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        quote TEXT NOT NULL,
        author VARCHAR(255),
        category_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_category (category_id),
        INDEX idx_user (user_id),
        INDEX idx_deleted_created (is_deleted, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Articles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title TEXT NOT NULL,
        url TEXT,
        category_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_category (category_id),
        INDEX idx_user (user_id),
        INDEX idx_deleted_created (is_deleted, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Books table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS books (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title TEXT NOT NULL,
        summary TEXT,
        author VARCHAR(255),
        url TEXT,
        category_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_category (category_id),
        INDEX idx_user (user_id),
        INDEX idx_deleted_created (is_deleted, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Videos table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS videos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title TEXT NOT NULL,
        url TEXT,
        category_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_category (category_id),
        INDEX idx_user (user_id),
        INDEX idx_deleted_created (is_deleted, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // AI Prompts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS aiprompts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        prompt TEXT NOT NULL,
        category_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_category (category_id),
        INDEX idx_user (user_id),
        INDEX idx_deleted_created (is_deleted, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tags table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        INDEX idx_name (name),
        INDEX idx_deleted (is_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tag junction tables
    const tagTables = [
      'quote_tags (quote_id INT, tag_id INT, PRIMARY KEY (quote_id, tag_id), FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE)',
      'article_tags (article_id INT, tag_id INT, PRIMARY KEY (article_id, tag_id), FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE)',
      'book_tags (book_id INT, tag_id INT, PRIMARY KEY (book_id, tag_id), FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE)',
      'video_tags (video_id INT, tag_id INT, PRIMARY KEY (video_id, tag_id), FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE)',
      'aiprompt_tags (aiprompt_id INT, tag_id INT, PRIMARY KEY (aiprompt_id, tag_id), FOREIGN KEY (aiprompt_id) REFERENCES aiprompts(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE)'
    ];

    for (const table of tagTables) {
      await connection.execute(`CREATE TABLE IF NOT EXISTS ${table} ENGINE=InnoDB`);
    }

    // Comments table - uses post_id to reference any content type
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        post_id INT NOT NULL,
        post_type ENUM('quote', 'article', 'book', 'video', 'aiprompt') NOT NULL,
        user_id INT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_post (post_id, post_type),
        INDEX idx_user (user_id),
        INDEX idx_deleted_created (is_deleted, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Votes table - uses post_id to reference any content type
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS votes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        post_id INT NOT NULL,
        post_type ENUM('quote', 'article', 'book', 'video', 'aiprompt') NOT NULL,
        user_id INT NOT NULL,
        vote_type ENUM('up', 'down') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        UNIQUE KEY unique_vote (post_id, post_type, user_id),
        INDEX idx_post (post_id, post_type),
        INDEX idx_user (user_id),
        INDEX idx_deleted (is_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    connection.release();
    // logger.info('MySQL schema initialized successfully');
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