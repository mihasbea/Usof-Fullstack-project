const Notification = require('../models/Notification');
const { parsePositiveInt } = require('../utils/validators');

async function loadNotification(req, res, next) {
    const notificationId = parsePositiveInt(req.params.notification_id);
    if (!notificationId) {
        return res.status(400).json({ message: 'Invalid notification ID format' });
    }

    try {
        const notification = await Notification.findByIdForUser(notificationId, req.user.id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        req.notification = notification;
        return next();
    } catch (error) {
        console.error(`Error loading notification ID ${req.params.notification_id}:`, error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = loadNotification;
