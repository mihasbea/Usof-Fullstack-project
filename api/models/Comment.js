const { pool, withTransaction } = require('../db/db');
const User = require('./User');

const LIKE_COUNTS_JOIN = `
    LEFT JOIN (
        SELECT
            comment_id,
            COUNT(CASE WHEN type = 'like' THEN 1 END) AS likes_count,
            COUNT(CASE WHEN type = 'dislike' THEN 1 END) AS dislikes_count
        FROM likes
        WHERE comment_id IS NOT NULL
        GROUP BY comment_id
    ) lc ON lc.comment_id = c.id
`;

const COMMENT_FIELDS = `
    c.id, c.post_id, c.parent_comment_id, c.content, c.status, c.created_at, c.updated_at,
    c.author_id, u.login AS author_login,
    COALESCE(lc.likes_count, 0) AS likes_count,
    COALESCE(lc.dislikes_count, 0) AS dislikes_count
`;
const SORT_COLUMNS = {
    date: 'c.created_at',
    likes: 'likes_count',
    post: 'p.title',
    author: 'u.login',
};
const SORT_DIRECTIONS = new Set(['asc', 'desc']);

class Comment {
    static async create({ post_id, parent_comment_id = null, author_id, content }) {
        const sql =
            'INSERT INTO comments (post_id, parent_comment_id, author_id, content) VALUES (?, ?, ?, ?)';
        const [result] = await pool.query(sql, [post_id, parent_comment_id, author_id, content]);
        return result.insertId;
    }

    static async findById(id) {
        const sql = `
            SELECT ${COMMENT_FIELDS}
            FROM comments c
            JOIN users u ON c.author_id = u.id
            ${LIKE_COUNTS_JOIN}
            WHERE c.id = ?
        `;
        const [rows] = await pool.query(sql, [id]);
        return rows[0];
    }

    static async findAll({ status, search, sort, order, limit, offset }) {
        const conditions = [];
        const params = [];
        if (status) {
            conditions.push('c.status = ?');
            params.push(status);
        }
        if (search) {
            const pattern = `%${search}%`;
            conditions.push(
                '(c.content LIKE ? OR p.title LIKE ? OR u.login LIKE ? OR u.full_name LIKE ?)'
            );
            params.push(pattern, pattern, pattern, pattern);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const sortColumn = SORT_COLUMNS[sort] || SORT_COLUMNS.date;
        const direction = SORT_DIRECTIONS.has(order) ? order.toUpperCase() : 'DESC';

        const commentsSql = `
            SELECT ${COMMENT_FIELDS}, p.title AS post_title
            FROM comments c
            JOIN users u ON c.author_id = u.id
            JOIN posts p ON p.id = c.post_id
            ${LIKE_COUNTS_JOIN}
            ${where}
            ORDER BY ${sortColumn} ${direction}, c.id DESC
            LIMIT ? OFFSET ?
        `;
        const countSql = `
            SELECT COUNT(*) AS total
            FROM comments c
            JOIN users u ON c.author_id = u.id
            JOIN posts p ON p.id = c.post_id
            ${where}
        `;

        const [[comments], [countRows]] = await Promise.all([
            pool.query(commentsSql, [...params, limit, offset]),
            pool.query(countSql, params),
        ]);
        return { comments, total: countRows[0].total };
    }

    static async findPublicSearch({ search, userId, limit, offset }) {
        const pattern = `%${search}%`;
        const viewerLike = userId
            ? `EXISTS (
                SELECT 1 FROM likes viewer_likes
                WHERE viewer_likes.comment_id = c.id
                  AND viewer_likes.author_id = ? AND viewer_likes.type = 'like'
            )`
            : 'FALSE';
        const viewerDislike = userId
            ? `EXISTS (
                SELECT 1 FROM likes viewer_likes
                WHERE viewer_likes.comment_id = c.id
                  AND viewer_likes.author_id = ? AND viewer_likes.type = 'dislike'
            )`
            : 'FALSE';
        const conditions = `
            WHERE c.status = 'active' AND p.status = 'active'
              AND (
                  c.content LIKE ? OR p.title LIKE ?
                  OR u.login LIKE ? OR u.full_name LIKE ?
              )
        `;
        const commentParams = userId
            ? [userId, userId, pattern, pattern, pattern, pattern, limit, offset]
            : [pattern, pattern, pattern, pattern, limit, offset];
        const countParams = [pattern, pattern, pattern, pattern];
        const commentsSql = `
            SELECT ${COMMENT_FIELDS}, p.title AS post_title,
                   ${viewerLike} AS is_liked,
                   ${viewerDislike} AS is_disliked
            FROM comments c
            JOIN users u ON c.author_id = u.id
            JOIN posts p ON p.id = c.post_id
            ${LIKE_COUNTS_JOIN}
            ${conditions}
            ORDER BY c.created_at DESC, c.id DESC
            LIMIT ? OFFSET ?
        `;
        const countSql = `
            SELECT COUNT(*) AS total
            FROM comments c
            JOIN users u ON c.author_id = u.id
            JOIN posts p ON p.id = c.post_id
            ${conditions}
        `;
        const [[comments], [countRows]] = await Promise.all([
            pool.query(commentsSql, commentParams),
            pool.query(countSql, countParams),
        ]);
        return { comments, total: countRows[0].total };
    }

    static async findByPost(postId, userId) {
        const viewerLike = userId
            ? `EXISTS (
                SELECT 1 FROM likes viewer_likes
                WHERE viewer_likes.comment_id = c.id
                  AND viewer_likes.author_id = ? AND viewer_likes.type = 'like'
            )`
            : 'FALSE';
        const viewerDislike = userId
            ? `EXISTS (
                SELECT 1 FROM likes viewer_likes
                WHERE viewer_likes.comment_id = c.id
                  AND viewer_likes.author_id = ? AND viewer_likes.type = 'dislike'
            )`
            : 'FALSE';
        const sql = `
            SELECT ${COMMENT_FIELDS}, ${viewerLike} AS is_liked,
                   ${viewerDislike} AS is_disliked
            FROM comments c
            JOIN users u ON c.author_id = u.id
            ${LIKE_COUNTS_JOIN}
            WHERE c.post_id = ? AND c.status = 'active'
            ORDER BY COALESCE(lc.likes_count, 0) ASC, c.created_at ASC, c.id ASC
        `;
        const [comments] = await pool.query(sql, userId ? [userId, userId, postId] : [postId]);
        return comments;
    }

    static async isActiveOnPost(id, postId) {
        const [rows] = await pool.query(
            `SELECT id FROM comments
             WHERE id = ? AND post_id = ? AND status = 'active'`,
            [id, postId]
        );
        return rows.length > 0;
    }

    static async findByAuthor(authorId, { limit, offset }) {
        const conditions = 'WHERE c.author_id = ?';
        const commentsSql = `
            SELECT ${COMMENT_FIELDS}, p.title AS post_title
            FROM comments c
            JOIN users u ON c.author_id = u.id
            JOIN posts p ON p.id = c.post_id
            ${LIKE_COUNTS_JOIN}
            ${conditions}
            ORDER BY c.created_at DESC, c.id DESC
            LIMIT ? OFFSET ?
        `;
        const countSql = `SELECT COUNT(*) AS total FROM comments c ${conditions}`;
        const [[comments], [countRows]] = await Promise.all([
            pool.query(commentsSql, [authorId, limit, offset]),
            pool.query(countSql, [authorId]),
        ]);
        return { comments, total: countRows[0].total };
    }

    static async findPublicByAuthor(authorId, { limit, offset }) {
        const visibility = "WHERE c.author_id = ? AND c.status = 'active' AND p.status = 'active'";
        const commentsSql = `
            SELECT ${COMMENT_FIELDS}, p.title AS post_title
            FROM comments c
            JOIN users u ON u.id = c.author_id
            JOIN posts p ON p.id = c.post_id
            ${LIKE_COUNTS_JOIN}
            ${visibility}
            ORDER BY c.created_at DESC, c.id DESC
            LIMIT ? OFFSET ?
        `;
        const countSql = `
            SELECT COUNT(*) AS total
            FROM comments c
            JOIN posts p ON p.id = c.post_id
            ${visibility}
        `;
        const [[comments], [countRows]] = await Promise.all([
            pool.query(commentsSql, [authorId, limit, offset]),
            pool.query(countSql, [authorId]),
        ]);
        return { comments, total: countRows[0].total };
    }

    static async findAccessInfo(id) {
        const sql = `
            SELECT
                c.id, c.author_id, c.status, c.post_id,
                p.status AS post_status, p.author_id AS post_author_id
            FROM comments c
            JOIN posts p ON p.id = c.post_id
            WHERE c.id = ?
        `;
        const [rows] = await pool.query(sql, [id]);
        return rows[0];
    }

    static async updateStatus(id, status) {
        const [result] = await pool.query('UPDATE comments SET status = ? WHERE id = ?', [
            status,
            id,
        ]);
        return result.affectedRows > 0;
    }

    static async update(id, changes) {
        const fields = [];
        const values = [];
        for (const field of ['content', 'status']) {
            if (changes[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(changes[field]);
            }
        }
        if (fields.length === 0) {
            return false;
        }
        const [result] = await pool.query(`UPDATE comments SET ${fields.join(', ')} WHERE id = ?`, [
            ...values,
            id,
        ]);
        return result.affectedRows > 0;
    }

    static async delete(id, authorId) {
        return withTransaction(async (db) => {
            const [authors] = await db.query(
                `WITH RECURSIVE comment_tree AS (
                    SELECT id, author_id
                    FROM comments
                    WHERE id = ?
                    UNION ALL
                    SELECT child.id, child.author_id
                    FROM comments child
                    JOIN comment_tree parent ON child.parent_comment_id = parent.id
                )
                SELECT DISTINCT author_id FROM comment_tree`,
                [id]
            );
            const [result] = await db.query('DELETE FROM comments WHERE id = ?', [id]);
            const authorIds = new Set([authorId, ...authors.map((row) => row.author_id)]);
            await User.recalculateRatings([...authorIds], db);
            return result.affectedRows > 0;
        });
    }
}

module.exports = Comment;
