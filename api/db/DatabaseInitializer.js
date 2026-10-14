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

            const [rows] = await connection.query('SELECT COUNT(*) AS total FROM users');
            if (rows[0].total > 0) {
                return { seeded: false };
            }

            await connection.query(await fs.readFile(SEED_PATH, 'utf8'));
            await createSeedFiles();
            return { seeded: true };
        } finally {
            await connection.end();
        }
    }
}

module.exports = DatabaseInitializer;
