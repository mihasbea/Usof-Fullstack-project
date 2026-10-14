const express = require('express');
const FavoriteController = require('../controllers/favoriteController');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, FavoriteController.getAll);

module.exports = router;
