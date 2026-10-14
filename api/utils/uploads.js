const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const { createHttpError } = require('./httpError');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const UPLOADS_URL = '/uploads';

const MIME_EXTENSIONS = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'application/pdf': '.pdf',
};

function createUploader({ subdir, allowedTypes, maxFileSize }) {
    const storage = multer.diskStorage({
        destination: path.join(UPLOADS_DIR, subdir),
        filename: (req, file, cb) => {
            cb(null, `${crypto.randomUUID()}${MIME_EXTENSIONS[file.mimetype]}`);
        },
    });

    const fileFilter = (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(createHttpError(400, `Unsupported file type. Allowed: ${allowedTypes.join(', ')}`));
        }
    };

    return multer({ storage, fileFilter, limits: { fileSize: maxFileSize } });
}

function toPublicPath(subdir, filename) {
    return `${UPLOADS_URL}/${subdir}/${filename}`;
}

function toDiskPath(publicPath) {
    return path.join(UPLOADS_DIR, publicPath.slice(UPLOADS_URL.length));
}

async function removeFiles(filePaths) {
    await Promise.all(
        filePaths.map(async (filePath) => {
            try {
                await fs.unlink(filePath);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        })
    );
}

module.exports = {
    UPLOADS_DIR,
    UPLOADS_URL,
    createUploader,
    toPublicPath,
    toDiskPath,
    removeFiles,
};
