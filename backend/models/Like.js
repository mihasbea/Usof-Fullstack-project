const { pool, withTransaction } = require('../db/db');
const User = require('./User');

const TARGET_COLUMNS = {
    post: 'post_id',
    comment: 'comment_id',
};

const LIKE_FIELDS = `
    l.id, l.type, l.target_type, l.post_id, l.comment_id, l.created_at,
    l.author_id, u.login AS author_login
`;

class Like {
    static async findById(id) {
        const sql = `
            SELECT ${LIKE_FIELDS}
            FROM likes l
            JOIN users u ON l.author_id = u.id
            WHERE l.id = ?
        `;
        const [rows] = await pool.query(sql, [id]);
        return rows[0];
    }

    static async findByTarget(targetType, targetId) {
        const sql = `
            SELECT ${LIKE_FIELDS}
            FROM likes l
            JOIN users u ON l.author_id = u.id
            WHERE l.${TARGET_COLUMNS[targetType]} = ?
            ORDER BY l.created_at DESC, l.id DESC
        `;
        const [likes] = await pool.query(sql, [targetId]);
        return likes;
    }

    static async findByAuthorAndTarget(authorId, targetType, targetId) {
        const sql = `
            SELECT id, type
            FROM likes
            WHERE author_id = ? AND ${TARGET_COLUMNS[targetType]} = ?
        `;
        const [rows] = await pool.query(sql, [authorId, targetId]);
        return rows[0];
    }

    static async create({ authorId, targetType, targetId, type, ownerId }) {
        return withTransaction(async (db) => {
            const sql = `
                INSERT INTO likes (author_id, type, target_type, ${TARGET_COLUMNS[targetType]})
                VALUES (?, ?, ?, ?)
            `;
            const [result] = await db.query(sql, [authorId, type, targetType, targetId]);
            await User.recalculateRatings([ownerId], db);
            return result.insertId;
        });
    }

    static async updateType(id, type, ownerId) {
        await withTransaction(async (db) => {
            await db.query('UPDATE likes SET type = ? WHERE id = ?', [type, id]);
            await User.recalculateRatings([ownerId], db);
        });
    }

    static async delete(id, ownerId) {
        await withTransaction(async (db) => {
            await db.query('DELETE FROM likes WHERE id = ?', [id]);
            await User.recalculateRatings([ownerId], db);
        });
    }
}

module.exports = Like;
