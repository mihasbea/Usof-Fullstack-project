const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '..', '.env'),
    quiet: true,
});

const express = require('express');
const DatabaseInitializer = require('./db/DatabaseInitializer');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const commentRoutes = require('./routes/commentRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const postRoutes = require('./routes/postRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const userRoutes = require('./routes/userRoutes');
const { initCronJobs } = require('./utils/cron');
const { UPLOADS_DIR, UPLOADS_URL } = require('./utils/uploads');

const REQUIRED_ENV_VARS = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_DIR = path.join(__dirname, 'admin');
const ADMIN_INDEX = path.join(ADMIN_DIR, 'index.html');
const PUBLIC_ASSETS_DIR = path.join(__dirname, 'public', 'assets');
const ADMIN_SECURITY_HEADERS = {
    'Content-Security-Policy':
        "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
};

const app = express();

app.use(express.json());
app.use((req, res, next) => {
    req.body ??= {};
    next();
});

app.use(
    UPLOADS_URL,
    express.static(UPLOADS_DIR, {
        setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    })
);
app.use('/assets', express.static(PUBLIC_ASSETS_DIR));
app.get(['/admin', '/admin/'], (req, res) => {
    res.sendFile(ADMIN_INDEX);
});
app.use(
    '/admin',
    express.static(ADMIN_DIR, {
        setHeaders: (res) => res.set(ADMIN_SECURITY_HEADERS),
    })
);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
    const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
    if (missingEnvVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
    }

    const { seeded } = await DatabaseInitializer.initialize();
    if (seeded) {
        console.log('Database was empty and has been filled with test data');
    }
    initCronJobs();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer().catch((error) => {
    console.error('Error starting server:', error);
    process.exit(1);
});
