const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const { UPLOADS_DIR } = require('../utils/uploads');

const IMAGE_SIZE = 64;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_BIT_DEPTH = 8;
const PNG_COLOR_TYPE_RGB = 2;
const SEED_IMAGE_COLORS = [
    [231, 76, 60],
    [46, 204, 113],
    [52, 152, 219],
    [241, 196, 15],
    [155, 89, 182],
];

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);

    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(zlib.crc32(body));

    return Buffer.concat([length, body, checksum]);
}

function createSolidColorPng(color) {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(IMAGE_SIZE, 0);
    header.writeUInt32BE(IMAGE_SIZE, 4);
    header[8] = PNG_BIT_DEPTH;
    header[9] = PNG_COLOR_TYPE_RGB;

    const row = Buffer.from([0, ...Array.from({ length: IMAGE_SIZE }, () => color).flat()]);
    const pixels = Buffer.concat(Array.from({ length: IMAGE_SIZE }, () => row));

    return Buffer.concat([
        PNG_SIGNATURE,
        createChunk('IHDR', header),
        createChunk('IDAT', zlib.deflateSync(pixels)),
        createChunk('IEND', Buffer.alloc(0)),
    ]);
}

async function createSeedFiles(connection) {
    const postsDir = path.join(UPLOADS_DIR, 'posts');
    await fs.mkdir(postsDir, { recursive: true });

    await Promise.all(
        SEED_IMAGE_COLORS.map((color, index) =>
            fs.writeFile(path.join(postsDir, `seed-${index + 1}.png`), createSolidColorPng(color))
        )
    );

    await copyCustomSeedFiles('posts');
    await copyCustomSeedFiles('avatars');
    await useCustomPostImages(connection);
}

async function useCustomPostImages(connection) {
    const sourceDir = path.join(__dirname, 'seed-assets', 'posts');

    for (let postId = 1; postId <= SEED_IMAGE_COLORS.length; postId += 1) {
        const filename = `seed-${postId}.jpg`;
        try {
            await fs.access(path.join(sourceDir, filename));
        } catch (error) {
            if (error.code === 'ENOENT') {
                continue;
            }
            throw error;
        }

        await connection.query(
            'UPDATE post_attachments SET file_path = ? WHERE post_id = ? AND file_path = ?',
            [`/uploads/posts/${filename}`, postId, `/uploads/posts/seed-${postId}.png`]
        );
    }
}

async function copyCustomSeedFiles(subdir) {
    const sourceDir = path.join(__dirname, 'seed-assets', subdir);
    const destinationDir = path.join(UPLOADS_DIR, subdir);
    await fs.mkdir(destinationDir, { recursive: true });

    let entries;
    try {
        entries = await fs.readdir(sourceDir, { withFileTypes: true });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return;
        }
        throw error;
    }

    await Promise.all(
        entries
            .filter((entry) => entry.isFile())
            .map((entry) =>
                fs.copyFile(path.join(sourceDir, entry.name), path.join(destinationDir, entry.name))
            )
    );
}

module.exports = { createSeedFiles };
