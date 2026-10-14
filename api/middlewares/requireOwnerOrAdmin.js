function requireOwnerOrAdmin(req, res, next) {
    const isOwner = req.user.id === Number(req.params.user_id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
        return res
            .status(403)
            .json({ message: 'The user should be an owner of the account or an admin' });
    }
    return next();
}

module.exports = requireOwnerOrAdmin;
