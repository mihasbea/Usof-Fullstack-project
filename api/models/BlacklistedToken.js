const { pool } = require('../db/db');

class BlacklistedToken {
    static async add(tokenHash, expiresAt) {
        const sql = 'INSERT IGNORE INTO blacklisted_tokens (token_hash, expires_at) VALUES (?, ?)';
        await pool.query(sql, [tokenHash, expiresAt]);
    }

    static async isBlacklisted(tokenHash) {
        const sql = 'SELECT 1 FROM blacklisted_tokens WHERE token_hash = ? AND expires_at > NOW()';
        const [rows] = await pool.query(sql, [tokenHash]);
        return rows.length > 0;
    }

    static async deleteExpired() {
        const sql = 'DELETE FROM blacklisted_tokens WHERE expires_at < NOW()';
        const [result] = await pool.query(sql);
        return result.affectedRows;
    }
}

module.exports = BlacklistedToken;
