const { pool, withTransaction } = require('../db/db');
const Notification = require('./Notification');

const CATEGORY_FIELDS = 'id, title, description, created_at, updated_at';
const CATEGORY_OWNER_FIELDS = `${CATEGORY_FIELDS}, created_by`;
const UPDATABLE_COLUMNS = ['title', 'description'];

class Category {
    static async findAll() {
        const sql = `SELECT ${CATEGORY_FIELDS} FROM categories ORDER BY title`;
        const [categories] = await pool.query(sql);
        return categories;
    }

    static async search({ search, creator, creatorId, sort, limit, offset }) {
        const conditions = [];
        const params = [];
        if (search) {
            const pattern = `%${search}%`;
            conditions.push(
                '(c.title LIKE ? OR c.description LIKE ? OR creator.login LIKE ? OR creator.full_name LIKE ?)'
            );
            params.push(pattern, pattern, pattern, pattern);
        }
        if (creator) {
            const pattern = `%${creator}%`;
            conditions.push('(creator.login LIKE ? OR creator.full_name LIKE ?)');
            params.push(pattern, pattern);
        }
        if (creatorId) {
            conditions.push('c.created_by = ?');
            params.push(creatorId);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const orderBy =
            {
                title: 'c.title ASC, c.id ASC',
                popular: 'posts_count DESC, c.title ASC, c.id ASC',
                newest: 'c.created_at DESC, c.id DESC',
            }[sort] || 'c.title ASC, c.id ASC';
        const categoriesSql = `
            SELECT c.id, c.title, c.description, c.created_at, c.created_by,
                   creator.login AS creator_login,
                   creator.full_name AS creator_full_name,
                   creator.profile_picture AS creator_profile_picture,
                   (SELECT COUNT(*)
                    FROM post_categories pc
                    JOIN posts p ON p.id = pc.post_id
                    WHERE pc.category_id = c.id AND p.status = 'active') AS posts_count
            FROM categories c
            LEFT JOIN users creator ON creator.id = c.created_by
            ${where}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const countSql = `
            SELECT COUNT(*) AS total
            FROM categories c
            LEFT JOIN users creator ON creator.id = c.created_by
            ${where}
        `;
        const [[categories], [countRows]] = await Promise.all([
            pool.query(categoriesSql, [...params, limit, offset]),
            pool.query(countSql, params),
        ]);
        return { categories, total: countRows[0].total };
    }

    static async findById(id) {
        const sql = `SELECT ${CATEGORY_OWNER_FIELDS} FROM categories WHERE id = ?`;
        const [rows] = await pool.query(sql, [id]);
        return rows[0];
    }

    static async findOwnedBy(userId) {
        const sql = `
            SELECT ${CATEGORY_FIELDS},
                   (SELECT COUNT(*)
                    FROM post_categories pc
                    JOIN posts p ON p.id = pc.post_id
                    WHERE pc.category_id = categories.id AND p.status = 'active')
                       AS posts_count
            FROM categories
            WHERE created_by = ?
            ORDER BY title
        `;
        const [categories] = await pool.query(sql, [userId]);
        return categories;
    }

    static async findExistingIds(ids) {
        const sql = 'SELECT id FROM categories WHERE id IN (?)';
        const [rows] = await pool.query(sql, [ids]);
        return rows.map((row) => row.id);
    }

    static async create({ title, description = null, created_by }) {
        const sql = 'INSERT INTO categories (title, description, created_by) VALUES (?, ?, ?)';
        const [result] = await pool.query(sql, [title, description, created_by]);
        return result.insertId;
    }

    static async update(id, changes) {
        const columns = Object.keys(changes).filter((column) => UPDATABLE_COLUMNS.includes(column));
        if (columns.length === 0) {
            return false;
        }

        const setClause = columns.map((column) => `${column} = ?`).join(', ');
        const values = columns.map((column) => changes[column]);
        const [result] = await pool.query(`UPDATE categories SET ${setClause} WHERE id = ?`, [
            ...values,
            id,
        ]);
        return result.affectedRows > 0;
    }

    static async findAllForSuggestions() {
        const categoriesSql = 'SELECT id, title, description FROM categories';
        const postsSql = `
            SELECT pc.category_id, p.title, p.content
            FROM post_categories pc
            JOIN posts p ON p.id = pc.post_id
            WHERE p.status = 'active'
        `;
        const [[categories], [posts]] = await Promise.all([
            pool.query(categoriesSql),
            pool.query(postsSql),
        ]);

        return categories.map((category) => {
            const categoryPosts = posts.filter((post) => post.category_id === category.id);
            return {
                ...category,
                posts_count: categoryPosts.length,
                posts_text: categoryPosts.map((post) => `${post.title} ${post.content}`),
            };
        });
    }

    static async findPostsWithCategory(id) {
        const postsSql = `
            SELECT p.id, p.author_id, p.title, p.content
            FROM posts p
            JOIN post_categories pc ON pc.post_id = p.id
            WHERE pc.category_id = ?
        `;
        const [posts] = await pool.query(postsSql, [id]);
        if (posts.length === 0) {
            return [];
        }

        const postIds = posts.map((post) => post.id);
        const categoriesSql = `
            SELECT pc.post_id, c.id, c.title
            FROM post_categories pc
            JOIN categories c ON c.id = pc.category_id
            WHERE pc.post_id IN (?)
        `;
        const commentsSql = `
            SELECT post_id, content
            FROM comments
            WHERE post_id IN (?) AND status = 'active'
        `;
        const [[categoryRows], [commentRows]] = await Promise.all([
            pool.query(categoriesSql, [postIds]),
            pool.query(commentsSql, [postIds]),
        ]);

        return posts.map((post) => ({
            ...post,
            categories: categoryRows
                .filter((row) => row.post_id === post.id)
                .map(({ id: categoryId, title }) => ({ id: categoryId, title })),
            comments_text: commentRows
                .filter((row) => row.post_id === post.id)
                .map((row) => row.content),
        }));
    }

    static async deleteWithNotifications(id, notifications) {
        return withTransaction(async (db) => {
            const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);
            await Notification.createMany(notifications, db);
            return result.affectedRows > 0;
        });
    }
}

module.exports = Category;
