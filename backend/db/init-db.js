require('dotenv').config({ quiet: true });

const DatabaseInitializer = require('./DatabaseInitializer');

const reset = process.argv.includes('--reset');

DatabaseInitializer.initialize({ reset })
    .then(({ seeded }) => {
        const action = reset ? 'recreated' : 'initialized';
        const seedInfo = seeded ? 'with test data' : 'test data skipped: the database is not empty';
        console.log(`Database has been ${action} (${seedInfo})`);
    })
    .catch((error) => {
        console.error('Database initialization error:', error);
        process.exitCode = 1;
    });
