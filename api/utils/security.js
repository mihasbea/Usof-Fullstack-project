const bcrypt = require('bcrypt');
const crypto = require('crypto');

const BCRYPT_ROUNDS = 10;

function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { hashPassword, generateToken, hashToken };
