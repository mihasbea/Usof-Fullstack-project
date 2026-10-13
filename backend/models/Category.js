const { pool, withTransaction } = require('../db/db');
const Notification = require('./Notification');

const CATEGORY_FIELDS = 'id, title, description, created_at, updated_at';
const UPDATABLE_COLUMNS = ['title', 'description'];

class Category {
    static async findAll() {
        const sql = `SELECT ${CATEGORY_FIELDS} FROM categories ORDER BY title`;
        const [categories] = await pool.query(sql);
        return categories;
    }

    static async findById(id) {
        const sql = `SELECT ${CATEGORY_FIELDS} FROM categories WHERE id = ?`;
        const [rows] = await pool.query(sql, [id]);
        return rows[0];
    }

    static async findExistingIds(ids) {
        const sql = 'SELECT id FROM categories WHERE id IN (?)';
        const [rows] = await pool.query(sql, [ids]);
        return rows.map((row) => row.id);
    }

    static async create({ title, description = null }) {
        const sql = 'INSERT INTO categories (title, description) VALUES (?, ?)';
        const [result] = await pool.query(sql, [title, description]);
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
