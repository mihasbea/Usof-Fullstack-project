const Category = require('../models/Category');
const { parsePositiveInt } = require('../utils/validators');

async function loadCategory(req, res, next) {
    const categoryId = parsePositiveInt(req.params.category_id);
    if (!categoryId) {
        return res.status(400).json({ message: 'Invalid category ID format' });
    }

    try {
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        req.category = category;
        return next();
    } catch (error) {
        console.error(`Error loading category ID ${req.params.category_id}:`, error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = loadCategory;
