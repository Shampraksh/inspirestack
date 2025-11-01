// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');


// import { v4 as uuidv4 } from 'uuid';
require('dotenv').config();

const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

// === Route imports ===
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const postRoutes = require('./routes/post');
const allPostsRoutes = require('./routes/allpost');
const categoryRoutes = require('./routes/category');

const app = express();
const PORT = process.env.PORT || 8080;

// === Security Middleware ===

// Helmet with some overrides to allow Google OAuth popups
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // we'll handle COEP manually
  })
);

// CORS - allow frontend origin
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// COOP + COEP headers (for Google OAuth popups)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Parse JSON payloads
app.use(express.json({ limit: '10mb' }));

// === Rate Limiting ===
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  message: { message: 'Too many requests from this IP' },
  standardHeaders: true, // adds RateLimit-* headers
  legacyHeaders: false, // disables X-RateLimit-* headers
  handler: (req, res, next, options) => {
    logger.warn(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
});

// Apply limiter to all routes except localhost
app.use((req, res, next) => {
  if (req.ip === '::1' || req.ip === '127.0.0.1') {
    return next(); // skip rate limit on local dev
  }
  return limiter(req, res, next);
});



// === Routes ===
app.use('/', allPostsRoutes);
app.use('/auth', authRoutes);
app.use('/content-type', contentRoutes);
app.use('/posts', postRoutes);
app.use('/categories', categoryRoutes);

// === Health Check Endpoint ===
app.get('/check', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'MySQL',
  });
});

// === 404 Handler ===
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});

// === Global Error Handler ===
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

// === Start Server ===
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
