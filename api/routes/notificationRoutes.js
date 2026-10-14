const express = require('express');
const NotificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middlewares/authMiddleware');
const loadNotification = require('../middlewares/loadNotification');

const router = express.Router();

router.use(requireAuth);

router.get('/', NotificationController.getAll);
router.patch('/read-all', NotificationController.markAllRead);
router.patch('/:notification_id', loadNotification, NotificationController.update);
router.delete('/:notification_id', loadNotification, NotificationController.delete);

module.exports = router;
