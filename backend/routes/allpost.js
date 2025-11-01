const express = require('express');
const { getDB } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Route to get all posts
router.get('/', async (req, res) => {
  try {
    const db = getDB();

//     const [posts] = await db.execute(`
//       WITH unified_content AS (
//     SELECT 'quote' AS type, id, quote AS content, author, created_at, NULL AS summary, category_id, user_id, NULL AS url 
//     FROM quotes WHERE is_deleted = 0
//     UNION ALL
//     SELECT 'article', id, title, NULL, created_at, NULL, category_id, user_id, url 
//     FROM articles WHERE is_deleted = 0
//     UNION ALL
//     SELECT 'book', id, title, author, created_at, summary, category_id, user_id, url 
//     FROM books WHERE is_deleted = 0
//     UNION ALL
//     SELECT 'video', id, title, NULL, created_at, NULL, category_id, user_id, url 
//     FROM videos WHERE is_deleted = 0
//     UNION ALL
//     SELECT 'aiprompt', id, prompt, NULL, created_at, NULL, category_id, user_id, NULL 
//     FROM aiprompts WHERE is_deleted = 0
// ),
// unified_tags AS (
//     SELECT 'quote' AS type, quote_id AS content_id, tag_id FROM quote_tags
//     UNION ALL
//     SELECT 'aiprompt', aiprompt_id, tag_id FROM aiprompt_tags
//     UNION ALL
//     SELECT 'book', book_id, tag_id FROM book_tags
//     UNION ALL
//     SELECT 'video', video_id, tag_id FROM video_tags
//     UNION ALL
//     SELECT 'article', article_id, tag_id FROM article_tags
// )
// SELECT 
//     c.type,
//     c.id,
//     c.content,
//     c.author,
//     c.created_at,
//     c.summary,
//     cat.name AS category_name,
//     u.username,
//     c.url,

//     -- Tags
//     (
//         SELECT JSON_ARRAYAGG(t.name)
//         FROM unified_tags ut
//         JOIN tags t ON t.id = ut.tag_id
//         WHERE ut.type = c.type AND ut.content_id = c.id
//     ) AS tags,

//     -- Comments
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', cm.id,
//                 'username', u2.username,
//                 'comment', cm.comment,
//                 'created_at', cm.created_at
//             )
//         )
//         FROM comments cm
//         JOIN users u2 ON u2.id = cm.user_id
//         WHERE cm.post_type = c.type
//           AND cm.post_id = c.id
//           AND cm.is_deleted = 0
//     ) AS comments,

//     -- Votes (points)
//     (
//         SELECT JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'id', v.id,
//                 'user_id', u3.id,
//                 'username', u3.username,
//                 'vote_type', v.vote_type,
//                 'created_at', v.created_at
//             )
//         )
//         FROM votes v
//         JOIN users u3 ON u3.id = v.user_id
//         WHERE v.post_type = c.type
//           AND v.post_id = c.id
//           AND v.is_deleted = 0
//     ) AS points,

//     -- Total counts for each type (scalar subqueries)
//     (SELECT COUNT(*) FROM quotes WHERE is_deleted = 0) AS quote_count,
//     (SELECT COUNT(*) FROM books WHERE is_deleted = 0) AS book_count,
//     (SELECT COUNT(*) FROM articles WHERE is_deleted = 0) AS article_count,
//     (SELECT COUNT(*) FROM aiprompts WHERE is_deleted = 0) AS aiprompt_count,
//     (SELECT COUNT(*) FROM videos WHERE is_deleted = 0) AS video_count

// FROM unified_content c
// LEFT JOIN categories cat ON cat.id = c.category_id
// LEFT JOIN users u ON u.id = c.user_id
// ORDER BY RAND()
// LIMIT 10;

//     `);


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

    -- Votes (points)
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

    -- ✅ Total count of votes (new column)
    (
        SELECT COUNT(*)
        FROM votes v
        WHERE v.post_type = c.type
          AND v.post_id = c.id
          AND v.vote_type = 'up'
          AND v.is_deleted = 0
    ) AS points_count,

    -- Total counts for each type
    (SELECT COUNT(*) FROM quotes WHERE is_deleted = 0) AS quote_count,
    (SELECT COUNT(*) FROM books WHERE is_deleted = 0) AS book_count,
    (SELECT COUNT(*) FROM articles WHERE is_deleted = 0) AS article_count,
    (SELECT COUNT(*) FROM aiprompts WHERE is_deleted = 0) AS aiprompt_count,
    (SELECT COUNT(*) FROM videos WHERE is_deleted = 0) AS video_count

FROM unified_content c
LEFT JOIN categories cat ON cat.id = c.category_id
LEFT JOIN users u ON u.id = c.user_id
ORDER BY c.created_at DESC;


    `);

    // console.log("posts:", posts);
    // logger.info('Fetched all posts:', posts);

    res.json({ posts });
  } catch (error) {
    logger.error('Error fetching all posts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
