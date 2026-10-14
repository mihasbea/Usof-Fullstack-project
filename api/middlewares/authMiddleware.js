const jwt = require('jsonwebtoken');
const BlacklistedToken = require('../models/BlacklistedToken');
const User = require('../models/User');
const { hashToken } = require('../utils/security');

async function requireAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Access token is missing' });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ message: 'Invalid or expired access token' });
    }

    try {
        if (await BlacklistedToken.isBlacklisted(hashToken(token))) {
            return res.status(401).json({ message: 'Token has been revoked' });
        }

        const user = await User.findById(payload.id);
        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        req.user = { id: user.id, login: user.login, role: user.role, exp: payload.exp };
        req.token = token;
        return next();
    } catch (error) {
        console.error('Error during authentication:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

function optionalAuth(req, res, next) {
    if (req.headers.authorization === undefined) {
        return next();
    }
    return requireAuth(req, res, next);
}

module.exports = { requireAuth, optionalAuth };
