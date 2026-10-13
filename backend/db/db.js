const mysql = require('mysql2/promise');

const connectionOptions = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};

const pool = mysql.createPool({ ...connectionOptions, database: process.env.DB_NAME });

async function withTransaction(callback) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

function isDuplicateEntryError(error) {
    return error.code === 'ER_DUP_ENTRY';
}

module.exports = {
    pool,
    connectionOptions,
    withTransaction,
    isDuplicateEntryError,
};
