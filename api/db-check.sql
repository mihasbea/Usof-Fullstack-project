SELECT t.table_name AS check_name, t.cnt AS value, IF(t.cnt >= 5, 'OK', 'FAIL') AS result
FROM (
    SELECT 'rows: users' AS table_name, COUNT(*) AS cnt FROM users
    UNION ALL SELECT 'rows: blacklisted_tokens', COUNT(*) FROM blacklisted_tokens
    UNION ALL SELECT 'rows: categories', COUNT(*) FROM categories
    UNION ALL SELECT 'rows: posts', COUNT(*) FROM posts
    UNION ALL SELECT 'rows: post_attachments', COUNT(*) FROM post_attachments
    UNION ALL SELECT 'rows: post_categories', COUNT(*) FROM post_categories
    UNION ALL SELECT 'rows: comments', COUNT(*) FROM comments
    UNION ALL SELECT 'rows: likes', COUNT(*) FROM likes
    UNION ALL SELECT 'rows: favorites', COUNT(*) FROM favorites
    UNION ALL SELECT 'rows: post_subscriptions', COUNT(*) FROM post_subscriptions
    UNION ALL SELECT 'rows: category_subscriptions', COUNT(*) FROM category_subscriptions
    UNION ALL SELECT 'rows: notifications', COUNT(*) FROM notifications
) t;

SELECT 'passwords are bcrypt hashes' AS check_name,
       COUNT(*) AS value,
       IF(COUNT(*) = 0, 'OK', 'FAIL') AS result
FROM users
WHERE NOT (LEFT(password, 4) IN ('$2a$', '$2b$', '$2y$') AND CHAR_LENGTH(password) = 60);

SELECT 'at least one admin' AS check_name, COUNT(*) AS value, IF(COUNT(*) >= 1, 'OK', 'FAIL') AS result
FROM users WHERE role = 'admin';
SELECT 'at least one regular user' AS check_name, COUNT(*) AS value, IF(COUNT(*) >= 1, 'OK', 'FAIL') AS result
FROM users WHERE role = 'user';

SELECT 'users.rating matches likes/dislikes' AS check_name,
       COUNT(*) AS value,
       IF(COUNT(*) = 0, 'OK', 'FAIL') AS result
FROM (
    SELECT u.id, u.rating,
           COALESCE((
               SELECT SUM(IF(l.type = 'like', 1, -1))
               FROM likes l
               LEFT JOIN posts p ON l.post_id = p.id
               LEFT JOIN comments c ON l.comment_id = c.id
               WHERE p.author_id = u.id OR c.author_id = u.id
           ), 0) AS expected
    FROM users u
) r
WHERE r.rating <> r.expected;

SELECT 'seed: at least one INACTIVE post (hiding feature)' AS check_name,
       COUNT(*) AS value, IF(COUNT(*) >= 1, 'OK', 'WARN') AS result
FROM posts WHERE status = 'inactive';

SELECT 'seed: at least one INACTIVE comment' AS check_name,
       COUNT(*) AS value, IF(COUNT(*) >= 1, 'OK', 'WARN') AS result
FROM comments WHERE status = 'inactive';

SELECT 'seed: at least one user with UNCONFIRMED e-mail' AS check_name,
       COUNT(*) AS value, IF(COUNT(*) >= 1, 'OK', 'WARN') AS result
FROM users WHERE email_confirmed = FALSE;

SELECT 'seed: at least one post with SEVERAL categories (task requirement)' AS check_name,
       COUNT(*) AS value, IF(COUNT(*) >= 1, 'OK', 'WARN') AS result
FROM (SELECT post_id FROM post_categories GROUP BY post_id HAVING COUNT(*) >= 2) m;

SELECT 'seed: both likes and dislikes exist' AS check_name,
       COUNT(DISTINCT type) AS value, IF(COUNT(DISTINCT type) = 2, 'OK', 'WARN') AS result
FROM likes;

SELECT 'seed: likes exist for both posts and comments' AS check_name,
       COUNT(DISTINCT target_type) AS value, IF(COUNT(DISTINCT target_type) = 2, 'OK', 'WARN') AS result
FROM likes;

SELECT VERSION() AS mysql_version;
SELECT 'CHECK constraint exists on likes' AS check_name,
       COUNT(*) AS value, IF(COUNT(*) >= 1, 'OK', 'WARN') AS result
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'likes' AND CONSTRAINT_TYPE = 'CHECK';

SELECT 'leftover test users' AS check_name, COUNT(*) AS value, IF(COUNT(*) = 0, 'OK', 'WARN') AS result
FROM users WHERE login LIKE 'chk%' OR login LIKE 'adm\_%';
SELECT 'leftover test categories' AS check_name, COUNT(*) AS value, IF(COUNT(*) = 0, 'OK', 'WARN') AS result
FROM categories WHERE title LIKE 'cat\_%';
SELECT 'leftover test posts' AS check_name, COUNT(*) AS value, IF(COUNT(*) = 0, 'OK', 'WARN') AS result
FROM posts WHERE title LIKE 'Post %' OR title LIKE 'Edited %';

SELECT id, login, email_confirmed,
       CHAR_LENGTH(email_confirm_token) AS confirm_token_len,
       CHAR_LENGTH(password_reset_token) AS reset_token_len,
       password_reset_expires
FROM users
WHERE email_confirm_token IS NOT NULL OR password_reset_token IS NOT NULL;

SELECT COUNT(*) AS blacklisted_tokens_now FROM blacklisted_tokens;
