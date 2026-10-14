function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'The user is not an admin' });
    }
    return next();
}

module.exports = requireAdmin;
