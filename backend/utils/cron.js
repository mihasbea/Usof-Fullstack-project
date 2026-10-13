const cron = require('node-cron');
const BlacklistedToken = require('../models/BlacklistedToken');

function initCronJobs() {
    cron.schedule('0 0 * * *', async () => {
        try {
            const deletedCount = await BlacklistedToken.deleteExpired();
            console.log(`[CRON] Expired tokens cleaned. Deleted rows: ${deletedCount}`);
        } catch (error) {
            console.error('[CRON] Token cleanup error:', error);
        }
    });

    console.log('[CRON] Background tasks initialized successfully.');
}

module.exports = { initCronJobs };
