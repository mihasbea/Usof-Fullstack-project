const multer = require('multer');

function notFoundHandler(req, res) {
    return res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
}

function errorHandler(error, req, res, _next) {
    if (error instanceof multer.MulterError) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ message: error.message });
    }

    const status = error.status ?? error.statusCode;
    if (error.expose && status >= 400 && status < 500) {
        return res.status(status).json({ message: error.message });
    }

    console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, error);
    return res.status(500).json({ message: 'Internal server error' });
}

module.exports = { notFoundHandler, errorHandler };
