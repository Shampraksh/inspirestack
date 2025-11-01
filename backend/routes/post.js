const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const contentValidation = [
  body('type').isIn(['quote', 'prompt', 'article', 'video', 'book']),
  body('title').optional().isLength({ min: 5, max: 500 }),
  body('content').optional().isLength({ min: 10, max: 5000 }),
  body('author').optional().isLength({ max: 255 }),
  body('url').optional().isURL(),
  body('category').notEmpty(),
  body('tags').optional().isArray({ max: 10 })
];

router.post('/addContent', authenticateToken, contentValidation, async (req, res) => {
  console.log("Adding content:", req.body);
  try {
    const errors = validationResult(req.body);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { userId, type, title, content, author, url, category, tags } = req.body;
    // const userId = req.body.userId;
    console.log("User ID:", userId);
    console.log("Content Type:", type);
    console.log("Title:", title);
    console.log("Content:", content);
    console.log("Author:", author);
    console.log("URL:", url);
    console.log("Category:", category);
    console.log("Tags:", tags);
    const db = getDB();

    // Get category ID
    const [categoryResult] = await db.execute(
      'SELECT id FROM categories WHERE slug = ? AND is_deleted = 0',
      [category]
    );

    console.log("Category Result:", categoryResult);

    if (categoryResult.length === 0) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const categoryId = categoryResult[0].id;
    console.log("categoryId:", categoryId);
    
    const dbType = type === 'prompt' ? 'aiprompt' : type;
    let contentId;

    // Insert based on type
    switch (dbType) {
      case 'quote':
        const [existingQuotes] = await db.execute(
          'SELECT COUNT(*) as count FROM quotes WHERE quote = ? AND author = ? AND category_id = ? AND user_id = ? AND is_deleted = 0',
          [content, author, categoryId, userId]
        );
        if (existingQuotes[0].count > 0) {
          return res.status(400).json({ message: 'Quote already exists' });
        }

        const [quoteResult] = await db.execute(
          'INSERT INTO quotes (quote, author, category_id, user_id) VALUES (?, ?, ?, ?)',
          [content, author, categoryId, userId]
        );
        contentId = quoteResult.insertId;
        break;

      case 'article':
        const [existingArticles] = await db.execute(
          'SELECT COUNT(*) as count FROM articles WHERE title = ? AND url = ? AND category_id = ? AND user_id = ? AND is_deleted = 0',
          [title, url, categoryId, userId]
        );
        if (existingArticles[0].count > 0) {
          return res.status(400).json({ message: 'Article already exists' });
        }

        const [articleResult] = await db.execute(
          'INSERT INTO articles (title, url, category_id, user_id) VALUES (?, ?, ?, ?)',
          [title, url, categoryId, userId]
        );
        contentId = articleResult.insertId;
        break;

      case 'book':
        const [existingBooks] = await db.execute(
          'SELECT COUNT(*) as count FROM books WHERE title = ? AND summary = ? AND author = ? AND category_id = ? AND user_id = ? AND is_deleted = 0',
          [title, content, author, categoryId, userId]
        );
        if (existingBooks[0].count > 0) {
          return res.status(400).json({ message: 'Book already exists' });
        }

        const [bookResult] = await db.execute(
          'INSERT INTO books (title, summary, author, url, category_id, user_id) VALUES (?, ?, ?, ?, ?, ?)',
          [title, content, author, url, categoryId, userId]
        );
        contentId = bookResult.insertId;
        break;

      case 'video':
        const [existingVideos] = await db.execute(
          'SELECT COUNT(*) as count FROM videos WHERE title = ? AND url = ? AND category_id = ? AND user_id = ? AND is_deleted = 0',
          [title, url, categoryId, userId]
        );
        if (existingVideos[0].count > 0) {
          return res.status(400).json({ message: 'Video already exists' });
        }

        const [videoResult] = await db.execute(
          'INSERT INTO videos (title, url, category_id, user_id) VALUES (?, ?, ?, ?)',
          [title, url, categoryId, userId]
        );
        contentId = videoResult.insertId;
        break;

      case 'aiprompt':
        const [existingPrompts] = await db.execute(
          'SELECT COUNT(*) as count FROM aiprompts WHERE prompt = ? AND category_id = ? AND user_id = ? AND is_deleted = 0',
          [content, categoryId, userId]
        );
        if (existingPrompts[0].count > 0) {
          return res.status(400).json({ message: 'AI Prompt already exists' });
        }

        const [promptResult] = await db.execute(
          'INSERT INTO aiprompts (prompt, category_id, user_id) VALUES (?, ?, ?)',
          [content, categoryId, userId]
        );
        contentId = promptResult.insertId;
        break;

      default:
        return res.status(400).json({ message: 'Invalid content type' });
    }

    // Handle tags
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (let tagName of tags) {
        if (tagName.trim()) {
          const normalizedTag = tagName.trim().toLowerCase();
          console.log("normalize:",normalizedTag);
          
          
          await db.execute('INSERT IGNORE INTO tags (name) VALUES (?)', [normalizedTag]);
          
          const [tagResult] = await db.execute('SELECT id FROM tags WHERE name = ?', [normalizedTag]);
          console.log("tagResult:",tagResult);
          const tagId = tagResult[0].id;
          console.log("tagId:",tagId);
          
          const tagTable = `${dbType}_tags`;
          console.log("tagTable:",tagTable);
          const contentColumn = `${dbType}_id`;
          console.log("contentColumn:",contentColumn);
          
          await db.execute(
            `INSERT IGNORE INTO ${tagTable} (${contentColumn}, tag_id) VALUES (?, ?)`,
            [contentId, tagId]
          );
        }
      }
    }

    // logger.info(`Content created: ${dbType} by user ${userId}`);

    res.status(201).json({ id: contentId, message: 'Content created successfully' });
  } catch (error) {
    logger.error('Create content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add comment

router.post('/:contentId/comments', authenticateToken, async (req, res) => {
  console.log("🟢 Adding comment request body:", req);

  try {
    const { contentId } = req.params;
    const { comment } = req.body; // ✅ direct destructuring (not text.comment)
    const userId = req.user.id;
    const postType = req.body.postType; // ✅ get postType from request body

    console.log("🆔 Content ID:", contentId);
    console.log("💬 Comment text:", comment);
    console.log("👤 User ID:", userId);
    console.log("📄 Post Type:", postType);

    const db = getDB();

    // 🧩 Validate input
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required' });
    }



    if (!postType) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // 🚫 Check for duplicate comment
    const [existingComments] = await db.execute(
      'SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND post_type = ? AND user_id = ? AND comment = ? AND is_deleted = 0',
      [contentId, postType, userId, comment.trim()]
    );

    if (existingComments[0].count > 0) {
      return res.status(400).json({ message: 'Duplicate comment' });
    }

    // 💾 Insert comment
    const [result] = await db.execute(
      'INSERT INTO comments (post_id, post_type, user_id, comment) VALUES (?, ?, ?, ?)',
      [contentId, postType, userId, comment.trim()]
    );

    // 👥 Fetch user info
    const [users] = await db.execute('SELECT username FROM users WHERE id = ?', [userId]);

    const newComment = {
      id: result.insertId,
      text: comment.trim(),
      user: `@${users[0].username}`,
      createdAt: Date.now(),
      createdBy: `@${users[0].username}`,
    };

    console.log("✅ Comment added:", newComment);

    res.status(201).json({ comment: newComment, message: 'Comment added successfully' });
  } catch (error) {
    console.error("❌ Add comment error:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete comment
router.delete('/deleteComment/:contentId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { contentId, commentId } = req.params;
    const userId = req.user.id;
    const db = getDB();

    console.log("🗑️ Deleting comment:", { contentId, commentId, userId });

    // Ensure all IDs are numbers to avoid SQL injection
    const postId = parseInt(contentId, 10);
    const commentID = parseInt(commentId, 10);
    const userID = parseInt(userId, 10);

    if (isNaN(postId) || isNaN(commentID) || isNaN(userID)) {
      return res.status(400).json({ message: 'Invalid ID provided' });
    }

    // Soft delete (set is_deleted = 1)
    const [result] = await db.execute(
      'UPDATE comments SET is_deleted = 1 WHERE post_id = ? AND id = ? AND user_id = ? AND is_deleted = 0',
      [postId, commentID, userID]
    );

    if (result.affectedRows > 0) {
      console.log('✅ Comment deleted successfully');
      return res.status(200).json({ message: 'Comment deleted successfully' });
    } else {
      console.warn('⚠️ Comment not found or already deleted');
      return res.status(404).json({ message: 'Comment not found or already deleted' });
    }
  } catch (error) {
    console.error('❌ Delete comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;