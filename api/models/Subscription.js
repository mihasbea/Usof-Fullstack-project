const { pool } = require('../db/db');

class Subscription {
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
