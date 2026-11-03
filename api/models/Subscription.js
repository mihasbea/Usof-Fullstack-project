const { pool } = require('../db/db');

class Subscription {
    static async subscribeToUser(followerId, followedId) {
        await pool.query(
            'INSERT INTO user_subscriptions (follower_id, followed_id) VALUES (?, ?)',
            [followerId, followedId]
        );
    }

    static async unsubscribeFromUser(followerId, followedId) {
        const [result] = await pool.query(
            'DELETE FROM user_subscriptions WHERE follower_id = ? AND followed_id = ?',
            [followerId, followedId]
        );
        return result.affectedRows > 0;
    }

    static async findUsersBySubscriber(userId, { limit, offset }) {
        const usersSql = `
            SELECT u.id, u.login, u.full_name, u.profile_picture, u.rating, u.role,
                   us.created_at AS followed_at
            FROM user_subscriptions us
            JOIN users u ON u.id = us.followed_id
            WHERE us.follower_id = ?
            ORDER BY u.login, u.id
            LIMIT ? OFFSET ?
        `;
        const countSql = 'SELECT COUNT(*) AS total FROM user_subscriptions WHERE follower_id = ?';
        const [[users], [countRows]] = await Promise.all([
            pool.query(usersSql, [userId, limit, offset]),
            pool.query(countSql, [userId]),
        ]);
        return { users, total: countRows[0].total };
    }

    static async getUserStats(userId, viewerId) {
        const sql = `
            SELECT
                (SELECT COUNT(*) FROM user_subscriptions WHERE followed_id = ?) AS follower_count,
                (SELECT COUNT(*) FROM user_subscriptions WHERE follower_id = ?) AS following_count,
                EXISTS (
                    SELECT 1 FROM user_subscriptions
                    WHERE follower_id = ? AND followed_id = ?
                ) AS is_following
        `;
        const [rows] = await pool.query(sql, [userId, userId, viewerId ?? 0, userId]);
        return {
            follower_count: Number(rows[0].follower_count),
            following_count: Number(rows[0].following_count),
            is_following: Boolean(rows[0].is_following),
        };
    }

    static async findFollowers(userId, { limit, offset }, viewerId) {
        const followersSql = `
            SELECT u.id, u.login, u.full_name, u.profile_picture, u.rating,
                   us.created_at AS followed_at,
                   EXISTS (
                       SELECT 1 FROM user_subscriptions viewer_subscriptions
                       WHERE viewer_subscriptions.follower_id = ?
                         AND viewer_subscriptions.followed_id = u.id
                   ) AS is_following
            FROM user_subscriptions us
            JOIN users u ON u.id = us.follower_id
            WHERE us.followed_id = ?
            ORDER BY us.created_at DESC, u.id DESC
            LIMIT ? OFFSET ?
        `;
        const countSql = 'SELECT COUNT(*) AS total FROM user_subscriptions WHERE followed_id = ?';
        const [[users], [countRows]] = await Promise.all([
            pool.query(followersSql, [viewerId ?? 0, userId, limit, offset]),
            pool.query(countSql, [userId]),
        ]);
        return { users, total: countRows[0].total };
    }

    static async subscribeToPost(userId, postId) {
        const sql = 'INSERT INTO post_subscriptions (user_id, post_id) VALUES (?, ?)';
        await pool.query(sql, [userId, postId]);
    }

    static async unsubscribeFromPost(userId, postId) {
        const sql = 'DELETE FROM post_subscriptions WHERE user_id = ? AND post_id = ?';
        const [result] = await pool.query(sql, [userId, postId]);
        return result.affectedRows > 0;
    }

    static async subscribeToCategory(userId, categoryId) {
        const sql = 'INSERT INTO category_subscriptions (user_id, category_id) VALUES (?, ?)';
        await pool.query(sql, [userId, categoryId]);
    }

    static async unsubscribeFromCategory(userId, categoryId) {
        const sql = 'DELETE FROM category_subscriptions WHERE user_id = ? AND category_id = ?';
        const [result] = await pool.query(sql, [userId, categoryId]);
        return result.affectedRows > 0;
    }

    static async findCategoriesByUser(userId) {
        const sql = `
            SELECT c.id, c.title, c.description, cs.created_at AS subscribed_at
            FROM category_subscriptions cs
            JOIN categories c ON c.id = cs.category_id
            WHERE cs.user_id = ?
            ORDER BY c.title
        `;
        const [categories] = await pool.query(sql, [userId]);
        return categories;
    }

    static async findPostSubscriberIds(postId, excludedUserId) {
        const sql = 'SELECT user_id FROM post_subscriptions WHERE post_id = ? AND user_id <> ?';
        const [rows] = await pool.query(sql, [postId, excludedUserId]);
        return rows.map((row) => row.user_id);
    }

    static async findCategorySubscribers(categoryIds, excludedUserId) {
        const sql = `
            SELECT cs.user_id, c.id AS category_id, c.title AS category_title
            FROM category_subscriptions cs
            JOIN categories c ON c.id = cs.category_id
            WHERE cs.category_id IN (?) AND cs.user_id <> ?
            ORDER BY c.title
        `;
        const [rows] = await pool.query(sql, [categoryIds, excludedUserId]);
        return rows;
    }
}

module.exports = Subscription;
