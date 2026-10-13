const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');

const STATUS_CHANGE_MESSAGES = {
    active: (title) => `The post "${title}" you follow is active again.`,
    inactive: (title) => `The post "${title}" you follow was locked by an administrator.`,
};

function toUserSummary(user) {
    return { id: user.id, login: user.login };
}

function buildPostUpdatedMessage(post, changedFields) {
    if (changedFields.includes('status')) {
        return STATUS_CHANGE_MESSAGES[post.status](post.title);
    }
    return `The post "${post.title}" you follow was updated: ${changedFields.join(', ')}.`;
}

function groupCategoriesByUser(rows) {
    const categoriesByUser = new Map();
    for (const row of rows) {
        const categories = categoriesByUser.get(row.user_id) ?? [];
        categories.push({ id: row.category_id, title: row.category_title });
        categoriesByUser.set(row.user_id, categories);
    }
    return categoriesByUser;
}

class NotificationService {
    static async notifyPostUpdated(post, changedFields, actor) {
        await NotificationService.sendSafely('a post update', async () => {
            const userIds = await Subscription.findPostSubscriberIds(post.id, actor.id);
            const message = buildPostUpdatedMessage(post, changedFields);

            return userIds.map((userId) => ({
                userId,
                postId: post.id,
                type: 'post_updated',
                message,
                data: {
                    post: { id: post.id, title: post.title, status: post.status },
                    changed_fields: changedFields,
                    updated_by: toUserSummary(actor),
                },
            }));
        });
    }

    static async notifyPostCommented(post, comment, author) {
        await NotificationService.sendSafely('a new comment', async () => {
            const userIds = await Subscription.findPostSubscriberIds(post.id, author.id);
            const message = `${author.login} commented on the post "${post.title}" you follow.`;

            return userIds.map((userId) => ({
                userId,
                postId: post.id,
                type: 'post_commented',
                message,
                data: {
                    post: { id: post.id, title: post.title },
                    comment: { id: comment.id },
                    author: toUserSummary(author),
                },
            }));
        });
    }

    static async notifyNewPostInCategories(post, categoryIds, author) {
        await NotificationService.sendSafely('a new post', async () => {
            const rows = await Subscription.findCategorySubscribers(categoryIds, author.id);
            const categoriesByUser = groupCategoriesByUser(rows);

            return [...categoriesByUser].map(([userId, categories]) => ({
                userId,
                postId: post.id,
                type: 'category_new_post',
                message: `${author.login} published "${post.title}" in ${categories
                    .map((category) => `"${category.title}"`)
                    .join(', ')}, which you follow.`,
                data: {
                    post: { id: post.id, title: post.title },
                    categories,
                    author: toUserSummary(author),
                },
            }));
        });
    }

    static async sendSafely(event, buildNotifications) {
        try {
            const notifications = await buildNotifications();
            await Notification.createMany(notifications);
        } catch (error) {
            console.error(`Error sending notifications about ${event}:`, error);
        }
    }
}

module.exports = NotificationService;
