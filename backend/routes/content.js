const express = require('express');
const { getDB } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();


// type = quote, article, book, video, aiprompt(filter)
router.get('/', async (req, res) => {
  let { type, category, page = 1, limit = 10 } = req.query;
  if(type == 'prompt'){
    type = 'aiprompt';
  }
  console.log('Content type requested:', type);
  console.log('Category filter applied:', category);
  const db = getDB();
  if(category == undefined && type==undefined || category == 'undefined' && type=='undefined'){
    console.log('No filters applied');
    try {
    
     const [posts] = await db.execute(`
                 WITH unified_content AS (
        SELECT 'quote' AS type, id, quote AS content, author, created_at, NULL AS summary, category_id, user_id, NULL AS url
        FROM quotes WHERE is_deleted = 0
        UNION ALL
        SELECT 'article', id, title, NULL, created_at, NULL, category_id, user_id, url
        FROM articles WHERE is_deleted = 0
        UNION ALL
        SELECT 'book', id, title, author, created_at, summary, category_id, user_id, url
        FROM books WHERE is_deleted = 0
        UNION ALL
        SELECT 'video', id, title, NULL, created_at, NULL, category_id, user_id, url
        FROM videos WHERE is_deleted = 0
        UNION ALL
        SELECT 'aiprompt', id, prompt, NULL, created_at, NULL, category_id, user_id, NULL
        FROM aiprompts WHERE is_deleted = 0
      ),
      unified_tags AS (
        SELECT 'quote' AS type, quote_id AS content_id, tag_id FROM quote_tags
        UNION ALL
        SELECT 'aiprompt', aiprompt_id, tag_id FROM aiprompt_tags
        UNION ALL
        SELECT 'book', book_id, tag_id FROM book_tags
        UNION ALL
        SELECT 'video', video_id, tag_id FROM video_tags
        UNION ALL
        SELECT 'article', article_id, tag_id FROM article_tags
      ),
      type_counts AS (
        SELECT 'quote' AS type, COUNT(*) AS count FROM quotes WHERE is_deleted = 0
        UNION ALL SELECT 'book', COUNT(*) FROM books WHERE is_deleted = 0
        UNION ALL SELECT 'article', COUNT(*) FROM articles WHERE is_deleted = 0
        UNION ALL SELECT 'aiprompt', COUNT(*) FROM aiprompts WHERE is_deleted = 0
        UNION ALL SELECT 'video', COUNT(*) FROM videos WHERE is_deleted = 0
      )
      SELECT 
        c.type,
        c.id,
        c.content,
        c.author,
        c.created_at,
        c.summary,
        cat.id AS category_id,
        cat.name AS category_name,
        u.username,
        c.url,

        -- Tags
        (
          SELECT JSON_ARRAYAGG(t.name)
          FROM unified_tags ut
          JOIN tags t ON t.id = ut.tag_id
          WHERE ut.type = c.type AND ut.content_id = c.id
        ) AS tags,

        -- Comments
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', cm.id,
              'username', u2.username,
              'comment', cm.comment,
              'created_at', cm.created_at
            )
          )
          FROM comments cm
          JOIN users u2 ON u2.id = cm.user_id
          WHERE cm.post_type = c.type
            AND cm.post_id = c.id
            AND cm.is_deleted = 0
        ) AS comments,

        -- Votes (detailed array)
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', v.id,
              'user_id', u3.id,
              'username', u3.username,
              'vote_type', v.vote_type,
              'created_at', v.created_at
            )
          )
          FROM votes v
          JOIN users u3 ON u3.id = v.user_id
          WHERE v.post_type = c.type
            AND v.post_id = c.id
            AND v.is_deleted = 0
        ) AS points,

        -- Total vote count
        (
          SELECT COUNT(*)
          FROM votes v
          WHERE v.post_type = c.type
            AND v.post_id = c.id
            AND v.vote_type = 'up'
            AND v.is_deleted = 0
        ) AS points_count,

        -- Totals per type
        (SELECT count FROM type_counts WHERE type = 'quote') AS quote_count,
        (SELECT count FROM type_counts WHERE type = 'book') AS book_count,
        (SELECT count FROM type_counts WHERE type = 'article') AS article_count,
        (SELECT count FROM type_counts WHERE type = 'aiprompt') AS aiprompt_count,
        (SELECT count FROM type_counts WHERE type = 'video') AS video_count

      FROM unified_content c
      LEFT JOIN categories cat ON cat.id = c.category_id
      LEFT JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC;


    `);
    // logger.info('Posts:', posts);
// console.log("Posts:"+posts);

    res.json({ posts });
  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
  }else if (
  (category != 'undefined' && type == 'undefined') ||
  (category != 'undefined' && !type)
) {
  console.log('Category filter applied:', category);

  try {
    const [posts] = await db.execute(`
      WITH unified_content AS (
        SELECT 'quote' AS type, id, quote AS content, author, created_at, NULL AS summary, category_id, user_id, NULL AS url
        FROM quotes WHERE is_deleted = 0
        UNION ALL
        SELECT 'article', id, title, NULL, created_at, NULL, category_id, user_id, url
        FROM articles WHERE is_deleted = 0
        UNION ALL
        SELECT 'book', id, title, author, created_at, summary, category_id, user_id, url
        FROM books WHERE is_deleted = 0
        UNION ALL
        SELECT 'video', id, title, NULL, created_at, NULL, category_id, user_id, url
        FROM videos WHERE is_deleted = 0
        UNION ALL
        SELECT 'aiprompt', id, prompt, NULL, created_at, NULL, category_id, user_id, NULL
        FROM aiprompts WHERE is_deleted = 0
      ),
      unified_tags AS (
        SELECT 'quote' AS type, quote_id AS content_id, tag_id FROM quote_tags
        UNION ALL
        SELECT 'aiprompt', aiprompt_id, tag_id FROM aiprompt_tags
        UNION ALL
        SELECT 'book', book_id, tag_id FROM book_tags
        UNION ALL
        SELECT 'video', video_id, tag_id FROM video_tags
        UNION ALL
        SELECT 'article', article_id, tag_id FROM article_tags
      )
      SELECT 
        c.type,
        c.id,
        c.content,
        c.author,
        c.created_at,
        c.summary,
        c.url,
        u.username,
        cat.id AS category_id,
        cat.name AS category_name,

        -- ✅ Tags
        (
          SELECT JSON_ARRAYAGG(t.name)
          FROM unified_tags ut
          JOIN tags t ON t.id = ut.tag_id
          WHERE ut.type = c.type AND ut.content_id = c.id
        ) AS tags,

        -- ✅ Comments
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', cm.id,
              'username', u2.username,
              'comment', cm.comment,
              'created_at', cm.created_at
            )
          )
          FROM comments cm
          JOIN users u2 ON u2.id = cm.user_id
          WHERE cm.post_type = c.type
            AND cm.post_id = c.id
            AND cm.is_deleted = 0
        ) AS comments,

        -- ✅ Votes array
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', v.id,
              'user_id', u3.id,
              'username', u3.username,
              'vote_type', v.vote_type,
              'created_at', v.created_at
            )
          )
          FROM votes v
          JOIN users u3 ON u3.id = v.user_id
          WHERE v.post_type = c.type
            AND v.post_id = c.id
            AND v.is_deleted = 0
        ) AS points,

        -- ✅ Vote count
        (
          SELECT COUNT(*)
          FROM votes v
          WHERE v.post_type = c.type
            AND v.post_id = c.id
            AND v.vote_type = 'up'
            AND v.is_deleted = 0
        ) AS points_count

      FROM unified_content c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.category_id = ?
      ORDER BY c.created_at DESC;
    `, [category]);

    // console.log("Posts:", posts);
    // logger.info('Posts:', posts);
    res.json({ posts });
  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} else if (
  (category === 'undefined' && type !== 'undefined') ||
  (category === undefined && type !== undefined)
) {
  console.log('Type filter applied:', type);

  try {
    const [posts] = await db.execute(`
      WITH unified_content AS (
        SELECT 'quote' AS type, id, quote AS content, author, created_at, NULL AS summary, category_id, user_id, NULL AS url 
        FROM quotes WHERE is_deleted = 0

        UNION ALL

        SELECT 'article', id, title, NULL, created_at, NULL, category_id, user_id, url 
        FROM articles WHERE is_deleted = 0

        UNION ALL

        SELECT 'book', id, title, author, created_at, summary, category_id, user_id, url 
        FROM books WHERE is_deleted = 0

        UNION ALL

        SELECT 'video', id, title, NULL, created_at, NULL, category_id, user_id, url 
        FROM videos WHERE is_deleted = 0

        UNION ALL

        SELECT 'aiprompt', id, prompt, NULL, created_at, NULL, category_id, user_id, NULL 
        FROM aiprompts WHERE is_deleted = 0
      ),
      unified_tags AS (
        SELECT 'quote' AS type, quote_id AS content_id, tag_id FROM quote_tags
        UNION ALL
        SELECT 'aiprompt', aiprompt_id, tag_id FROM aiprompt_tags
        UNION ALL
        SELECT 'book', book_id, tag_id FROM book_tags
        UNION ALL
        SELECT 'video', video_id, tag_id FROM video_tags
        UNION ALL
        SELECT 'article', article_id, tag_id FROM article_tags 
      )
      SELECT 
        c.type,
        c.id,
        c.content,
        c.category_id,
        cat.name AS category_name,
        c.author,
        c.summary,
        c.url,
        c.created_at,
        u.username,

        -- ✅ Tags
        (
          SELECT JSON_ARRAYAGG(t.name)
          FROM unified_tags ut
          JOIN tags t ON t.id = ut.tag_id
          WHERE ut.type = c.type AND ut.content_id = c.id
        ) AS tags,

        -- ✅ Comments
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', cm.id,
              'comment', cm.comment,
              'username', u2.username,
              'created_at', cm.created_at
            )
          )
          FROM comments cm
          JOIN users u2 ON u2.id = cm.user_id
          WHERE cm.post_type = c.type
            AND cm.post_id = c.id
            AND cm.is_deleted = 0
        ) AS comments,

        -- ✅ Votes array
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', v.id,
              'user_id', u3.id,
              'username', u3.username,
              'vote_type', v.vote_type,
              'created_at', v.created_at
            )
          )
          FROM votes v
          JOIN users u3 ON u3.id = v.user_id
          WHERE v.post_type = c.type
            AND v.post_id = c.id
            AND v.is_deleted = 0
        ) AS points,

        -- ✅ Total points count
        (
          SELECT COUNT(*)
          FROM votes v
          WHERE v.post_type = c.type
            AND v.post_id = c.id
            AND v.vote_type = 'up'
            AND v.is_deleted = 0
        ) AS points_count

      FROM unified_content c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.type = ?
      ORDER BY c.created_at DESC;
    `, [type]);

    // console.log("Posts:", posts);
    // logger.info('Posts:', posts);
    res.json({ posts });
  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} else {
  console.log('Both Type and Category filters applied:', type, category);

  // Build WHERE clause dynamically
  let whereSQL = [];
  let params = [];

  if (type && type !== 'undefined') {
    whereSQL.push('c.type = ?');
    params.push(type);
  }

  if (category && category !== 'undefined') {
    whereSQL.push('c.category_id = ?');
    params.push(category);
  }

  const whereClause = whereSQL.length ? `WHERE ${whereSQL.join(' AND ')}` : '';

  try {
    const [posts] = await db.execute(`
      WITH unified_content AS (
        SELECT 'quote' AS type, id, quote AS content, author, created_at, NULL AS summary, category_id, user_id, NULL AS url 
        FROM quotes WHERE is_deleted = 0
        UNION ALL
        SELECT 'article', id, title, NULL, created_at, NULL, category_id, user_id, url 
        FROM articles WHERE is_deleted = 0
        UNION ALL
        SELECT 'book', id, title, author, created_at, summary, category_id, user_id, url 
        FROM books WHERE is_deleted = 0
        UNION ALL
        SELECT 'video', id, title, NULL, created_at, NULL, category_id, user_id, url 
        FROM videos WHERE is_deleted = 0
        UNION ALL
        SELECT 'aiprompt', id, prompt, NULL, created_at, NULL, category_id, user_id, NULL 
        FROM aiprompts WHERE is_deleted = 0
      ),
      unified_tags AS (
        SELECT 'quote' AS type, quote_id AS content_id, tag_id FROM quote_tags
        UNION ALL
        SELECT 'aiprompt', aiprompt_id, tag_id FROM aiprompt_tags
        UNION ALL
        SELECT 'book', book_id, tag_id FROM book_tags
        UNION ALL
        SELECT 'video', video_id, tag_id FROM video_tags
        UNION ALL
        SELECT 'article', article_id, tag_id FROM article_tags
      )
      SELECT 
        c.type,
        c.id,
        c.content,
        c.author,
        c.created_at,
        c.summary,
        c.url,
        u.username,
        cat.id AS category_id,
        cat.name AS category_name,

        -- ✅ Tags
        (
          SELECT JSON_ARRAYAGG(t.name)
          FROM unified_tags ut
          JOIN tags t ON t.id = ut.tag_id
          WHERE ut.type = c.type AND ut.content_id = c.id
        ) AS tags,

        -- ✅ Comments
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', cm.id,
              'comment', cm.comment,
              'username', u2.username,
              'created_at', cm.created_at
            )
          )
          FROM comments cm
          JOIN users u2 ON u2.id = cm.user_id
          WHERE cm.post_type = c.type
            AND cm.post_id = c.id
            AND cm.is_deleted = 0
        ) AS comments,

        -- ✅ Votes array
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', v.id,
              'user_id', u3.id,
              'username', u3.username,
              'vote_type', v.vote_type,
              'created_at', v.created_at
            )
          )
          FROM votes v
          JOIN users u3 ON u3.id = v.user_id
          WHERE v.post_type = c.type
            AND v.post_id = c.id
            AND v.is_deleted = 0
        ) AS points,

        -- ✅ Total points count
        (
          SELECT COUNT(*)
          FROM votes v
          WHERE v.post_type = c.type
            AND v.post_id = c.id
            AND v.vote_type = 'up'
            AND v.is_deleted = 0
        ) AS points_count

      FROM unified_content c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN categories cat ON cat.id = c.category_id
      ${whereClause}
      ORDER BY c.created_at DESC;
    `, params);

    // console.log("Posts:", posts);
    // logger.info('Posts:', posts);
    res.json({ posts });
  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}




  
});



// PUT /posts/:contentId/vote

router.put('/:contentId/vote', authenticateToken, async (req, res) => {
  console.log("🗳️ Vote endpoint hit");

  try {
    const { contentId } = req.params;
    const { contentType, voteType } = req.body; // expects { contentType: 'quote', voteType: 'upvote' }
    const userId = req.user.id;
    const db = getDB();

    console.log(`🧩 Received contentId: ${contentId}, contentType: ${contentType}, voteType: ${voteType}, userId: ${userId}`);

    // 🧩 Normalize vote type
    const normalizedVoteType =
      voteType === 'upvote' ? 'up' :
      voteType === 'downvote' ? 'down' : null;

    if (!normalizedVoteType) {
      console.warn('⚠️ Invalid vote type received:', voteType);
      return res.status(400).json({ message: 'Invalid vote type' });
    }

    // 🧠 Determine correct table name
    const table = contentType === 'prompt' ? 'aiprompts' : `${contentType}s`;
    console.log(`🧠 Resolved table for contentType "${contentType}" → ${table}`);

    // ✅ Check if the content exists
    const [rows] = await db.execute(
      `SELECT id FROM ${table} WHERE id = ? AND is_deleted = 0 LIMIT 1`,
      [contentId]
    );

    if (rows.length === 0) {
      console.warn(`🚫 Content not found in table "${table}" for ID: ${contentId}`);
      return res.status(404).json({ message: 'Content not found' });
    }

    const postType = table === 'aiprompts' ? 'aiprompt' : table.slice(0, -1);
    console.log(`📦 Normalized postType: ${postType}`);

    // 🧾 Check for existing vote (active or soft-deleted)
    const [existingVotes] = await db.execute(
      `SELECT id, vote_type, is_deleted 
       FROM votes 
       WHERE post_id = ? AND post_type = ? AND user_id = ?
       LIMIT 1`,
      [contentId, postType, userId]
    );

    if (existingVotes.length > 0) {
      const existingVote = existingVotes[0];
      const { id, vote_type: currentVote, is_deleted } = existingVote;

      if (!is_deleted && currentVote === normalizedVoteType) {
        // 🗑️ Same vote → soft delete (toggle off)
        console.log(`🗑️ Removing existing "${currentVote}" vote`);
        await db.execute(
          `UPDATE votes 
           SET is_deleted = 1, updated_at = NOW() 
           WHERE id = ?`,
          [id]
        );
      } else {
        // ♻️ Update or restore vote
        console.log(`🔁 Updating/restoring vote to "${normalizedVoteType}"`);
        await db.execute(
          `UPDATE votes 
           SET vote_type = ?, is_deleted = 0, updated_at = NOW() 
           WHERE id = ?`,
          [normalizedVoteType, id]
        );
      }
    } else {
      // ➕ New vote
      console.log(`➕ Adding new "${normalizedVoteType}" vote`);
      await db.execute(
        `INSERT INTO votes (post_id, post_type, user_id, vote_type, created_at, is_deleted)
         VALUES (?, ?, ?, ?, NOW(), 0)`,
        [contentId, postType, userId, normalizedVoteType]
      );
    }

    // ⚖️ Recalculate total votes (return latest user votes)
    const [votes] = await db.execute(
      `SELECT v.id, v.user_id, u.username, v.vote_type, v.created_at 
       FROM votes v
       JOIN users u ON v.user_id = u.id
       WHERE v.post_id = ? AND v.post_type = ? AND v.is_deleted = 0
       ORDER BY v.created_at DESC`,
      [contentId, postType]
    );

    console.log(`✅ Vote recorded successfully. Returning ${votes.length} vote(s).`);
    res.json(votes);

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.warn('⚠️ Duplicate vote detected — handled gracefully');
      return res.status(409).json({ message: 'Duplicate vote ignored' });
    }

    console.error('❌ Vote error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



module.exports = router;