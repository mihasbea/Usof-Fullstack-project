const Notification = require('../models/Notification');
const { buildPagination, parsePagination } = require('../utils/pagination');

const DEFAULT_PAGE_SIZE = 20;
const BOOLEAN_QUERY_VALUES = ['true', 'false'];

class NotificationController {
    static async getAll(req, res) {
        try {
            const pagination = parsePagination(req.query, DEFAULT_PAGE_SIZE);
            if (pagination.error) {
                return res.status(400).json({ message: pagination.error });
            }

            const { unread, filter } = req.query;
            if (unread !== undefined && !BOOLEAN_QUERY_VALUES.includes(unread)) {
                return res.status(400).json({ message: 'Unread must be true or false' });
            }
            if (filter !== undefined && !['all', 'unread', 'read'].includes(filter)) {
                return res.status(400).json({ message: 'Filter must be all, unread, or read' });
            }

            await Notification.deleteExpiredRead();
            const { page, limit, offset } = pagination;
            const selectedFilter = filter ?? (unread === 'true' ? 'unread' : 'all');
            const [notifications, counts] = await Promise.all([
                Notification.findByUser({
                    userId: req.user.id,
                    filter: selectedFilter,
                    limit,
                    offset,
                }),
                Notification.countByUser(req.user.id),
            ]);
            const total =
                selectedFilter === 'unread'
                    ? counts.unread
                    : selectedFilter === 'read'
                      ? counts.read
                      : counts.unread + counts.read;

            return res.status(200).json({
                data: notifications,
                total_count: counts.unread + counts.read,
                unread_count: counts.unread,
                read_count: counts.read,
                pagination: buildPagination('total_notifications', total, page, limit),
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async update(req, res) {
        try {
            const { is_read } = req.body;
            if (typeof is_read !== 'boolean') {
                return res.status(400).json({ message: 'is_read must be true or false' });
            }

            await Notification.setRead(req.notification.id, is_read);
            return res.status(200).json({
                message: 'Notification updated successfully',
                notification: { ...req.notification, is_read },
            });
        } catch (error) {
            console.error(`Error updating notification ID ${req.notification.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async markAllRead(req, res) {
        try {
            const updated = await Notification.markAllRead(req.user.id);
            return res
                .status(200)
                .json({ message: 'All notifications marked as read', updated_count: updated });
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async delete(req, res) {
        try {
            await Notification.delete(req.notification.id);
            return res.status(200).json({ message: 'Notification deleted successfully' });
        } catch (error) {
            console.error(`Error deleting notification ID ${req.notification.id}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = NotificationController;
