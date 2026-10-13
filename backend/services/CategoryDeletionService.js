const Category = require('../models/Category');
const { CategorySuggester } = require('./CategorySuggester');

const NOTIFICATION_TYPE = 'category_deleted';

function buildMessage(deletedCategory, post, remainingCategories, suggestedCategories) {
    const firstSentence =
        remainingCategories.length === 0
            ? `The category "${deletedCategory.title}" was deleted, so your post "${post.title}" has no categories now.`
            : `The category "${deletedCategory.title}" was deleted from your post "${post.title}".`;
    const request =
        remainingCategories.length === 0
            ? 'Choose a new category so more people can find it.'
            : 'Add another category so more people can find it.';
    const suggestion =
        suggestedCategories.length > 0
            ? ` Suggested categories: ${suggestedCategories.map((c) => c.title).join(', ')}.`
            : '';

    return `${firstSentence} ${request}${suggestion}`;
}

function buildNotification(deletedCategory, post, suggestedCategories) {
    const remainingCategories = post.categories.filter((c) => c.id !== deletedCategory.id);

    return {
        userId: post.author_id,
        postId: post.id,
        type: NOTIFICATION_TYPE,
        message: buildMessage(deletedCategory, post, remainingCategories, suggestedCategories),
        data: {
            deleted_category: { id: deletedCategory.id, title: deletedCategory.title },
            post: { id: post.id, title: post.title },
            remaining_categories: remainingCategories,
            suggested_categories: suggestedCategories,
        },
    };
}

class CategoryDeletionService {
    static async delete(category) {
        const [categories, posts] = await Promise.all([
            Category.findAllForSuggestions(),
            Category.findPostsWithCategory(category.id),
        ]);

        const suggestions = new CategorySuggester(categories).suggestForDeletedCategory(
            category.id,
            posts
        );
        const notifications = posts.map((post) =>
            buildNotification(category, post, suggestions.get(post.id))
        );

        await Category.deleteWithNotifications(category.id, notifications);

        return {
            affectedPosts: posts.length,
            notifiedUsers: new Set(posts.map((post) => post.author_id)).size,
        };
    }
}

module.exports = CategoryDeletionService;
