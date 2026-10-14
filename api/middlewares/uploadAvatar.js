const { createUploader } = require('../utils/uploads');

const uploadAvatar = createUploader({
    subdir: 'avatars',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024,
}).single('avatar');

module.exports = uploadAvatar;
