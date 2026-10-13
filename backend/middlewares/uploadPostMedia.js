const { createUploader } = require('../utils/uploads');

const MAX_ATTACHMENTS = 10;

const uploadPostMedia = createUploader({
    subdir: 'posts',
    allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'application/pdf',
    ],
    maxFileSize: 50 * 1024 * 1024,
}).array('attachments', MAX_ATTACHMENTS);

module.exports = uploadPostMedia;
