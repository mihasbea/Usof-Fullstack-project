const { pool, withTransaction } = require('../db/db');

const PUBLIC_FIELDS = 'id, login, full_name, profile_picture, rating, role, created_at';
const PROFILE_FIELDS = `${PUBLIC_FIELDS}, email, updated_at`;

class User {
    static async create(userData) {
        const {
            login,
            password,
            full_name,
            email,
            role = 'user',
            email_confirmed = false,
            email_confirm_token = null,
        } = userData;

        const sql = `
            INSERT INTO users (login, password, full_name, email, role, email_confirmed, email_confirm_token)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(sql, [
            login,
            password,
            full_name,
            email,
            role,
            email_confirmed,
            email_confirm_token,
        ]);
        return result.insertId;
    }

    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await pool.query(sql, [email]);
        return rows[0];
    }

    static async findByLogin(login) {
        const sql = 'SELECT * FROM users WHERE login = ?';
        const [rows] = await pool.query(sql, [login]);
        return rows[0];
    }

    static async findByLoginOrEmail(login, email) {
        const sql = 'SELECT id FROM users WHERE login = ? OR email = ?';
        const [rows] = await pool.query(sql, [login, email]);
        return rows[0];
    }

    static async findByCredentials({ login, email }) {
        const conditions = [];
        const params = [];
        if (login !== undefined) {
            conditions.push('login = ?');
            params.push(login);
        }
        if (email !== undefined) {
            conditions.push('email = ?');
            params.push(email);
        }

        const sql = `SELECT * FROM users WHERE ${conditions.join(' AND ')}`;
        const [rows] = await pool.query(sql, params);
        return rows[0];
    }

    static async findAllPublic() {
        const sql = `SELECT ${PUBLIC_FIELDS} FROM users ORDER BY id`;
        const [rows] = await pool.query(sql);
        return rows;
    }

    static async findAllProfiles() {
        const sql = `SELECT ${PROFILE_FIELDS} FROM users ORDER BY id`;
        const [rows] = await pool.query(sql);
        return rows;
    }

    static async findPublicById(id) {
        const sql = `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`;
        const [rows] = await pool.query(sql, [id]);
        return rows[0];
    }

    static async findById(id) {
        const sql = `SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`;
        const [rows] = await pool.query(sql, [id]);
        return rows[0];
    }

    static async savePasswordResetToken(userId, tokenHash, expiresAt) {
        const sql = `
            UPDATE users
            SET password_reset_token = ?, password_reset_expires = ?
            WHERE id = ?
        `;
        const [result] = await pool.query(sql, [tokenHash, expiresAt, userId]);
        return result.affectedRows > 0;
    }

    static async findByValidResetToken(tokenHash) {
        const sql = `
            SELECT id FROM users
            WHERE password_reset_token = ? AND password_reset_expires > NOW()
        `;
        const [rows] = await pool.query(sql, [tokenHash]);
        return rows[0];
    }

    static async updatePassAndClearResetToken(userId, hashedNewPass) {
        const sql = `
            UPDATE users
            SET password = ?, password_reset_token = NULL, password_reset_expires = NULL
            WHERE id = ?
        `;
        const [result] = await pool.query(sql, [hashedNewPass, userId]);
        return result.affectedRows > 0;
    }

    static async findByConfirmToken(tokenHash) {
        const sql = 'SELECT id FROM users WHERE email_confirm_token = ?';
        const [rows] = await pool.query(sql, [tokenHash]);
        return rows[0];
    }

    static async confirmEmail(userId) {
        const sql = `
            UPDATE users
            SET email_confirmed = TRUE, email_confirm_token = NULL
            WHERE id = ?
        `;
        const [result] = await pool.query(sql, [userId]);
        return result.affectedRows > 0;
    }

    static async update(id, updateData) {
        const columns = Object.keys(updateData);
        if (columns.length === 0) {
            return false;
        }

        const setClause = columns.map((column) => `${pool.escapeId(column)} = ?`).join(', ');
        const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
        const [result] = await pool.query(sql, [...Object.values(updateData), id]);
        return result.affectedRows > 0;
    }

    static async delete(id) {
        return withTransaction(async (db) => {
            const affectedSql = `
                SELECT p.author_id AS user_id
                FROM likes l
                JOIN posts p ON l.post_id = p.id
                WHERE l.author_id = ?
                UNION
                SELECT c.author_id
                FROM likes l
                JOIN comments c ON l.comment_id = c.id
                WHERE l.author_id = ?
                UNION
                SELECT c.author_id
                FROM comments c
                JOIN posts p ON c.post_id = p.id
                WHERE p.author_id = ?
            `;
            const [affectedRows] = await db.query(affectedSql, [id, id, id]);

            const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

            const affectedUserIds = affectedRows
                .map((row) => row.user_id)
                .filter((userId) => userId !== id);
            await User.recalculateRatings(affectedUserIds, db);

            return result.affectedRows > 0;
        });
    }

    static async recalculateRatings(userIds, db = pool) {
        if (userIds.length === 0) {
            return;
        }

        const sql = `
            UPDATE users u
            SET rating = (
                SELECT COALESCE(SUM(IF(l.type = 'like', 1, -1)), 0)
                FROM likes l
                LEFT JOIN posts p ON l.post_id = p.id
                LEFT JOIN comments c ON l.comment_id = c.id
                WHERE p.author_id = u.id OR c.author_id = u.id
            )
            WHERE u.id IN (?)
        `;
        await db.query(sql, [userIds]);
    }
}

module.exports = User;
