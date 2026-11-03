const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const { UPLOADS_DIR } = require('../utils/uploads');
const { connectionOptions } = require('./db');
const { createSeedFiles } = require('./seedFiles');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

class DatabaseInitializer {
    static async initialize({ reset = false } = {}) {
        const databaseName = process.env.DB_NAME;
        const escapedName = mysql.escapeId(databaseName);
        const connection = await mysql.createConnection({
            ...connectionOptions,
            multipleStatements: true,
        });

        try {
            if (reset) {
                await connection.query(`DROP DATABASE IF EXISTS ${escapedName}`);
                await fs.rm(UPLOADS_DIR, { recursive: true, force: true });
            }

            await connection.query(
                `CREATE DATABASE IF NOT EXISTS ${escapedName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            await connection.changeUser({ database: databaseName });
            await connection.query(await fs.readFile(SCHEMA_PATH, 'utf8'));
            await DatabaseInitializer.ensureCategoryOwnership(connection, databaseName);
            await DatabaseInitializer.ensureCommentReplies(connection, databaseName);
            await DatabaseInitializer.ensureNotificationReadAt(connection, databaseName);

            const [rows] = await connection.query('SELECT COUNT(*) AS total FROM users');
            if (rows[0].total > 0) {
                return { seeded: false };
            }

            await connection.query(await fs.readFile(SEED_PATH, 'utf8'));
            await createSeedFiles(connection);
            return { seeded: true };
        } finally {
            await connection.end();
        }
    }

    static async ensureCategoryOwnership(connection, databaseName) {
        const [columns] = await connection.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'created_by'`,
            [databaseName]
        );
        if (columns.length > 0) {
            return;
        }

        await connection.query(`
            ALTER TABLE categories
            ADD COLUMN created_by INT UNSIGNED NULL,
            ADD INDEX idx_categories_created_by (created_by),
            ADD CONSTRAINT fk_categories_created_by
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        `);
    }

    static async ensureCommentReplies(connection, databaseName) {
        const [columns] = await connection.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'comments'
               AND COLUMN_NAME = 'parent_comment_id'`,
            [databaseName]
        );
        const [indexes] = await connection.query(
            `SELECT INDEX_NAME
             FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'comments'
               AND INDEX_NAME = 'idx_comments_parent_comment'`,
            [databaseName]
        );
        const [constraints] = await connection.query(
            `SELECT CONSTRAINT_NAME
             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'comments'
               AND COLUMN_NAME = 'parent_comment_id'
               AND REFERENCED_TABLE_NAME = 'comments'`,
            [databaseName]
        );

        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE comments
                ADD COLUMN parent_comment_id INT UNSIGNED NULL AFTER post_id,
                ADD INDEX idx_comments_parent_comment (parent_comment_id),
                ADD CONSTRAINT fk_comments_parent_comment
                    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
            `);
            return;
        }

        if (indexes.length === 0) {
            await connection.query(
                'ALTER TABLE comments ADD INDEX idx_comments_parent_comment (parent_comment_id)'
            );
        }
        if (constraints.length === 0) {
            await connection.query(`
                ALTER TABLE comments
                ADD CONSTRAINT fk_comments_parent_comment
                    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
            `);
        }
    }

    static async ensureNotificationReadAt(connection, databaseName) {
        const [columns] = await connection.query(
            `SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications'
               AND COLUMN_NAME = 'read_at'`,
            [databaseName]
        );
        if (columns.length === 0) {
            await connection.query(
                'ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP NULL AFTER is_read'
            );
        }
        await connection.query(
            'UPDATE notifications SET read_at = created_at WHERE is_read = TRUE AND read_at IS NULL'
        );

        const [typeColumns] = await connection.query(
            `SELECT COLUMN_TYPE
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications'
               AND COLUMN_NAME = 'type'`,
            [databaseName]
        );
        if (typeColumns.length > 0 && !typeColumns[0].COLUMN_TYPE.includes("'post_liked'")) {
            await connection.query(`
                ALTER TABLE notifications
                MODIFY COLUMN type ENUM(
                    'category_deleted',
                    'post_updated',
                    'post_commented',
                    'category_new_post',
                    'post_liked'
                ) NOT NULL
            `);
        }

        const [indexes] = await connection.query(
            `SELECT INDEX_NAME
             FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications'
               AND INDEX_NAME = 'idx_read_at'`,
            [databaseName]
        );
        if (indexes.length === 0) {
            await connection.query(
                'ALTER TABLE notifications ADD INDEX idx_read_at (is_read, read_at)'
            );
        }
    }
}

module.exports = DatabaseInitializer;
