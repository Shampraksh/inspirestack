// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
// const contentRoutes = require('./routes/content');
// const postRoutes = require('./routes/post');
// const allPostsRoutes = require('./routes/allpost');

const app = express();
const PORT = process.env.PORT || 8080;

// === Middleware ===

// Helmet with some overrides to allow Google OAuth popups
app.use(helmet({
  crossOriginEmbedderPolicy: false, // we set COEP manually
}));

// CORS - allow frontend origin
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// COOP + COEP headers for Google OAuth popup
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// JSON parser
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { message: 'Too many requests from this IP' },
});
app.use(limiter);

// === Routes ===
// app.use('/', allPostsRoutes);
app.use('/auth', authRoutes);
// app.use('/content', contentRoutes);
// app.use('/posts', postRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'MySQL',
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  // MySQL specific errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ message: 'Duplicate entry' });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Invalid reference' });
    
  }

  res.status(500).json({ message: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
