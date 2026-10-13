const express = require('express');
const SubscriptionController = require('../controllers/subscriptionController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/posts', SubscriptionController.getPosts);
router.get('/categories', SubscriptionController.getCategories);

module.exports = router;
