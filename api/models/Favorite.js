const { pool } = require('../db/db');

class Favorite {
    static async add(userId, postId) {
        await pool.query('INSERT INTO favorites (user_id, post_id) VALUES (?, ?)', [
            userId,
            postId,
        ]);
    }

    static async remove(userId, postId) {
        const [result] = await pool.query(
            'DELETE FROM favorites WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Favorite;
