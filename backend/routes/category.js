const express = require('express');
const { getDB } = require('../config/database');

const router = express.Router();

// Route to get all categories
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const [categories] = await db.execute(
      'SELECT id, name, slug as _id, icon, color, created_at FROM categories WHERE is_deleted = 0 ORDER BY name ASC'
    );
// console.log("categories:", categories);
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;