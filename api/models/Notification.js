const { pool } = require('../db/db');

const NOTIFICATION_FIELDS = 'id, type, post_id, message, data, is_read, created_at';

function toNotification(row) {
    return { ...row, is_read: Boolean(row.is_read) };
}

class Notification {
    static async createMany(notifications, db = pool) {
        if (notifications.length === 0) {
            return;
        }

        const sql = 'INSERT INTO notifications (user_id, post_id, type, message, data) VALUES ?';
        const rows = notifications.map((notification) => [
            notification.userId,
            notification.postId,
            notification.type,
            notification.message,
            JSON.stringify(notification.data),
        ]);
        await db.query(sql, [rows]);
    }

    static async findByUser({ userId, unreadOnly, limit, offset }) {
        const unreadCondition = unreadOnly ? 'AND is_read = FALSE' : '';
        const sql = `
            SELECT ${NOTIFICATION_FIELDS}
            FROM notifications
            WHERE user_id = ? ${unreadCondition}
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await pool.query(sql, [userId, limit, offset]);
        return rows.map(toNotification);
    }

    static async countByUser(userId) {
        const sql = `
            SELECT COUNT(*) AS total, COALESCE(SUM(is_read = FALSE), 0) AS unread
            FROM notifications
            WHERE user_id = ?
        `;
        const [rows] = await pool.query(sql, [userId]);
        return { total: rows[0].total, unread: Number(rows[0].unread) };
    }

    static async findByIdForUser(id, userId) {
        const sql = `SELECT ${NOTIFICATION_FIELDS} FROM notifications WHERE id = ? AND user_id = ?`;
        const [rows] = await pool.query(sql, [id, userId]);
        return rows[0] ? toNotification(rows[0]) : undefined;
    }

    static async setRead(id, isRead) {
        const [result] = await pool.query('UPDATE notifications SET is_read = ? WHERE id = ?', [
            isRead,
            id,
        ]);
        return result.affectedRows > 0;
    }

    static async markAllRead(userId) {
        const sql = 'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE';
        const [result] = await pool.query(sql, [userId]);
        return result.affectedRows;
    }

    static async delete(id) {
        const [result] = await pool.query('DELETE FROM notifications WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
}

module.exports = Notification;
