const { pool, withTransaction } = require('../db/db');
const { visibilityCondition } = require('../utils/visibility');
const User = require('./User');

const SORT_COLUMNS = {
    likes: 'likes_count',
    date: 'p.created_at',
};

const LIKE_COUNTS_JOIN = `
    LEFT JOIN (
        SELECT
            post_id,
            COUNT(CASE WHEN type = 'like' THEN 1 END) AS likes_count,
            COUNT(CASE WHEN type = 'dislike' THEN 1 END) AS dislikes_count
        FROM likes
        WHERE post_id IS NOT NULL
        GROUP BY post_id
    ) lc ON lc.post_id = p.id
`;

const POST_FIELDS = `
    p.id, p.title, p.content, p.status, p.created_at, p.updated_at,
    p.author_id, u.login AS author_login,
    COALESCE(lc.likes_count, 0) AS likes_count,
    COALESCE(lc.dislikes_count, 0) AS dislikes_count
`;

const UPDATABLE_COLUMNS = ['title', 'content', 'status'];

class Post {
    static async create({ author_id, title, content, categoryIds, attachments }) {
        return withTransaction(async (db) => {
            const [result] = await db.query(
                'INSERT INTO posts (author_id, title, content) VALUES (?, ?, ?)',
                [author_id, title, content]
            );
            const postId = result.insertId;

            await Post.replaceCategories(postId, categoryIds, db);
            await db.query('INSERT INTO post_subscriptions (user_id, post_id) VALUES (?, ?)', [
                author_id,
                postId,
            ]);

            if (attachments.length > 0) {
                await db.query(
                    'INSERT INTO post_attachments (post_id, file_path, file_type) VALUES ?',
                    [attachments.map((attachment) => [postId, attachment.path, attachment.type])]
                );
            }

            return postId;
        });
    }

    static async findAll({ user, filters, sort, order, limit, offset }) {
        const { where, params } = buildListConditions(user, filters);
        const direction = order === 'asc' ? 'ASC' : 'DESC';

        const postsSql = `
            SELECT ${POST_FIELDS}
            FROM posts p
            JOIN users u ON p.author_id = u.id
            ${LIKE_COUNTS_JOIN}
            ${where}
            ORDER BY ${SORT_COLUMNS[sort]} ${direction}, p.created_at DESC, p.id DESC
            LIMIT ? OFFSET ?
        `;
        const countSql = `SELECT COUNT(*) AS total FROM posts p ${where}`;

        const [[posts], [countRows]] = await Promise.all([
            pool.query(postsSql, [...params, limit, offset]),
            pool.query(countSql, params),
        ]);

        return { posts: await Post.attachCategories(posts), total: countRows[0].total };
    }

    static async findById(id) {
        const sql = 'SELECT id, author_id, title, status FROM posts WHERE id = ?';
        const [rows] = await pool.query(sql, [id]);
        return rows[0];
    }

    static async getById(id, userId) {
        const postSql = `
            SELECT ${POST_FIELDS}
            FROM posts p
            JOIN users u ON p.author_id = u.id
            ${LIKE_COUNTS_JOIN}
            WHERE p.id = ?
        `;
        const attachmentsSql = `
            SELECT id, file_path, file_type
            FROM post_attachments
            WHERE post_id = ?
        `;

        const [[posts], categories, [attachments], userState] = await Promise.all([
            pool.query(postSql, [id]),
            Post.getCategories(id),
            pool.query(attachmentsSql, [id]),
            userId === undefined ? {} : Post.getUserState(id, userId),
        ]);

        return posts.length > 0 ? { ...posts[0], ...userState, categories, attachments } : null;
    }

    static async getUserState(postId, userId) {
        const sql = `
            SELECT
                EXISTS (SELECT 1 FROM favorites WHERE user_id = ? AND post_id = ?) AS is_favorite,
                EXISTS (
                    SELECT 1 FROM post_subscriptions WHERE user_id = ? AND post_id = ?
                ) AS is_subscribed
        `;
        const [rows] = await pool.query(sql, [userId, postId, userId, postId]);
        return {
            is_favorite: Boolean(rows[0].is_favorite),
            is_subscribed: Boolean(rows[0].is_subscribed),
        };
    }

    static async getCategories(postId) {
        const sql = `
            SELECT c.id, c.title, c.description
            FROM categories c
            JOIN post_categories pc ON c.id = pc.category_id
            WHERE pc.post_id = ?
            ORDER BY c.title
        `;
        const [categories] = await pool.query(sql, [postId]);
        return categories;
    }

    static async update(postId, changes, categoryIds) {
        const columns = Object.keys(changes).filter((column) => UPDATABLE_COLUMNS.includes(column));

        await withTransaction(async (db) => {
            if (columns.length > 0) {
                const setClause = columns.map((column) => `${column} = ?`).join(', ');
                const values = columns.map((column) => changes[column]);
                await db.query(`UPDATE posts SET ${setClause} WHERE id = ?`, [...values, postId]);
            }

            if (categoryIds) {
                await Post.replaceCategories(postId, categoryIds, db);
            }
        });
    }

    static async delete(postId) {
        return withTransaction(async (db) => {
            const [attachments] = await db.query(
                'SELECT file_path FROM post_attachments WHERE post_id = ?',
                [postId]
            );
            const [authors] = await db.query(
                `SELECT author_id FROM posts WHERE id = ?
                 UNION
                 SELECT author_id FROM comments WHERE post_id = ?`,
                [postId, postId]
            );

            await db.query('DELETE FROM posts WHERE id = ?', [postId]);
            await User.recalculateRatings(
                authors.map((row) => row.author_id),
                db
            );

            return attachments.map((attachment) => attachment.file_path);
        });
    }

    static async findAttachmentPathsByAuthor(authorId) {
        const sql = `
            SELECT pa.file_path
            FROM post_attachments pa
            JOIN posts p ON pa.post_id = p.id
            WHERE p.author_id = ?
        `;
        const [rows] = await pool.query(sql, [authorId]);
        return rows.map((row) => row.file_path);
    }

    static async replaceCategories(postId, categoryIds, db = pool) {
        await db.query('DELETE FROM post_categories WHERE post_id = ?', [postId]);
        await db.query('INSERT INTO post_categories (post_id, category_id) VALUES ?', [
            categoryIds.map((categoryId) => [postId, categoryId]),
        ]);
    }

    static async attachCategories(posts) {
        if (posts.length === 0) {
            return posts;
        }

        const sql = `
            SELECT pc.post_id, c.id, c.title
            FROM post_categories pc
            JOIN categories c ON c.id = pc.category_id
            WHERE pc.post_id IN (?)
            ORDER BY c.title
        `;
        const [rows] = await pool.query(sql, [posts.map((post) => post.id)]);

        return posts.map((post) => ({
            ...post,
            categories: rows
                .filter((row) => row.post_id === post.id)
                .map(({ id, title }) => ({ id, title })),
        }));
    }
}

function buildListConditions(
    user,
    { status, categoryIds, dateFrom, dateTo, favoriteOf, subscribedBy, search }
) {
    const conditions = [];
    const params = [];

    const visibility = visibilityCondition('p', user);
    if (visibility) {
        conditions.push(visibility.sql);
        params.push(...visibility.params);
    }
    if (status) {
        conditions.push('p.status = ?');
        params.push(status);
    }
    if (categoryIds) {
        conditions.push('p.id IN (SELECT post_id FROM post_categories WHERE category_id IN (?))');
        params.push(categoryIds);
    }
    if (dateFrom) {
        conditions.push('p.created_at >= ?');
        params.push(dateFrom);
    }
    if (dateTo) {
        conditions.push('p.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
        params.push(dateTo);
    }
    if (search) {
        const pattern = `%${search}%`;
        conditions.push(
            '(p.title LIKE ? OR p.content LIKE ? OR p.author_id IN (SELECT id FROM users WHERE login LIKE ? OR full_name LIKE ?))'
        );
        params.push(pattern, pattern, pattern, pattern);
    }

    if (favoriteOf) {
        conditions.push('p.id IN (SELECT post_id FROM favorites WHERE user_id = ?)');
        params.push(favoriteOf);
    }
    if (subscribedBy) {
        conditions.push('p.id IN (SELECT post_id FROM post_subscriptions WHERE user_id = ?)');
        params.push(subscribedBy);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params };
}

module.exports = Post;
