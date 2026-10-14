import { el, formatDate, truncate } from '../dom.js';
import {
    button,
    field,
    formError,
    likeCounts,
    openModal,
    renderPagination,
    runAction,
    select,
    showToast,
    statusBadge,
    submitForm,
    table,
} from '../ui.js';

const PAGE_SIZE = 10;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

function categoryCheckboxes(categories, selectedIds) {
    return el(
        'fieldset',
        { className: 'checkbox-list' },
        el('legend', {}, 'Categories'),
        categories.map((category) =>
            el(
                'label',
                { className: 'checkbox' },
                el('input', {
                    type: 'checkbox',
                    name: 'categories',
                    value: String(category.id),
                    checked: selectedIds.includes(category.id),
                }),
                category.title
            )
        )
    );
}

function checkedCategoryIds(form) {
    return [...form.querySelectorAll('input[name="categories"]:checked')].map((input) =>
        Number(input.value)
    );
}

function openCreateForm(api, categories, onSaved) {
    const title = el('input', { name: 'title', required: true, maxlength: 255 });
    const content = el('textarea', { name: 'content', required: true, rows: 6 });
    const attachments = el('input', {
        name: 'attachments',
        type: 'file',
        accept: 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf',
        multiple: true,
    });
    const error = formError();

    const form = el(
        'form',
        {
            className: 'form',
            onsubmit: (event) =>
                submitForm(event, error, async () => {
                    const selectedFiles = [...attachments.files];
                    if (selectedFiles.length > MAX_ATTACHMENTS) {
                        throw new Error(`Choose no more than ${MAX_ATTACHMENTS} attachments`);
                    }
                    if (selectedFiles.some((file) => file.size > MAX_ATTACHMENT_SIZE)) {
                        throw new Error('Each attachment must be no larger than 50 MB');
                    }

                    const body = new FormData();
                    body.set('title', title.value);
                    body.set('content', content.value);
                    body.set('categories', checkedCategoryIds(form).join(','));
                    selectedFiles.forEach((file) => body.append('attachments', file));
                    await api.post('/posts', body);
                    dialog.close();
                    onSaved('Post created');
                }),
        },
        field('Title', title),
        field('Content', content),
        field('Attachments (up to 10 files, 50 MB each)', attachments),
        categoryCheckboxes(categories, []),
        error,
        el('button', { className: 'button button-primary', type: 'submit' }, 'Create post')
    );
    const dialog = openModal('New post', form);
}

function openCategoriesForm(api, post, categories, onSaved) {
    const error = formError();
    const form = el(
        'form',
        {
            className: 'form',
            onsubmit: (event) =>
                submitForm(event, error, async () => {
                    await api.patch(`/posts/${post.id}`, { categories: checkedCategoryIds(form) });
                    dialog.close();
                    onSaved('Categories updated');
                }),
        },
        categoryCheckboxes(
            categories,
            post.categories.map((category) => category.id)
        ),
        error,
        el('button', { className: 'button button-primary', type: 'submit' }, 'Save')
    );
    const dialog = openModal(`Categories of post #${post.id}`, form);
}

function renderAttachment(attachment) {
    if (attachment.file_type === 'image') {
        return el(
            'a',
            { href: attachment.file_path, target: '_blank', rel: 'noopener' },
            el('img', { className: 'attachment-image', src: attachment.file_path, alt: '' })
        );
    }
    return el(
        'a',
        { href: attachment.file_path, target: '_blank', rel: 'noopener' },
        `${attachment.file_type}: ${attachment.file_path.split('/').pop()}`
    );
}

async function openDetails(api, postId, onChanged) {
    const body = el('div', { className: 'details' }, el('p', { className: 'muted' }, 'Loading…'));
    const dialog = openModal(`Post #${postId}`, body);
    dialog.classList.add('post-details-modal');

    async function render() {
        const { ok, result } = await runAction(() =>
            Promise.all([
                api.get(`/posts/${postId}`),
                api.get(`/posts/${postId}/comments`),
                api.get(`/posts/${postId}/like`),
            ])
        );
        if (!ok) {
            return;
        }
        const [post, comments, likes] = result;

        const commentRows = comments.map((comment) => [
            comment.author_login,
            truncate(comment.content, 120),
            statusBadge(comment.status),
            formatDate(comment.created_at),
            el(
                'div',
                { className: 'actions' },
                button(
                    comment.status === 'active' ? 'Lock' : 'Activate',
                    () => changeComment(comment),
                    'secondary'
                ),
                button('Delete', () => deleteComment(comment), 'danger')
            ),
        ]);

        body.replaceChildren(
            el('h3', {}, post.title),
            el(
                'div',
                { className: 'post-meta' },
                el(
                    'span',
                    { className: 'muted' },
                    `by ${post.author_login} · ${formatDate(post.created_at)} · `
                ),
                likeCounts(post),
                statusBadge(post.status)
            ),
            el('p', { className: 'post-content' }, post.content),
            el(
                'div',
                { className: 'chips' },
                post.categories.map((category) => el('span', { className: 'chip' }, category.title))
            ),
            post.attachments.length > 0 &&
                el('div', { className: 'attachments' }, post.attachments.map(renderAttachment)),
            el('h4', {}, `Comments (${comments.length})`),
            table(
                ['Author', 'Comment', 'Status', 'Date', ''],
                commentRows,
                'No comments',
                'post-comments-table'
            ),
            el('h4', {}, `Likes (${likes.length})`),
            table(
                ['User', 'Type', 'Date'],
                likes.map((like) => [like.author_login, like.type, formatDate(like.created_at)]),
                'No likes'
            )
        );
    }

    async function changeComment(comment) {
        const status = comment.status === 'active' ? 'inactive' : 'active';
        const { ok } = await runAction(
            () => api.patch(`/comments/${comment.id}`, { status }),
            'Comment updated'
        );
        if (ok) {
            await render();
        }
    }

    async function deleteComment(comment) {
        if (!window.confirm('Delete this comment?')) {
            return;
        }
        const { ok } = await runAction(
            () => api.delete(`/comments/${comment.id}`),
            'Comment deleted'
        );
        if (ok) {
            await render();
            onChanged();
        }
    }

    await render();
}

export async function renderPosts(container, { api }) {
    const state = { page: 1, status: '', categories: '', sort: 'likes', order: 'desc', search: '' };
    const listArea = el('div');

    const { ok, result: categories } = await runAction(() => api.get('/categories'));
    if (!ok) {
        return;
    }

    const reload = (message) => {
        showToast(message);
        load();
    };

    const filter = (name, options) => {
        const input = select(name, options, state[name]);
        input.addEventListener('change', () => {
            state[name] = input.value;
            state.page = 1;
            load();
        });
        return field(name[0].toUpperCase() + name.slice(1), input);
    };
    const searchInput = el('input', {
        type: 'search',
        name: 'search',
        placeholder: 'Search posts…',
        'aria-label': 'Search posts',
    });
    let searchTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            load();
        }, 250);
    });

    container.replaceChildren(
        el(
            'div',
            { className: 'toolbar' },
            el('h1', {}, 'Posts'),
            button('New post', () => openCreateForm(api, categories, reload))
        ),
        el(
            'div',
            { className: 'filters' },
            field('Search', searchInput),
            filter('status', [
                ['', 'All'],
                ['active', 'Active'],
                ['inactive', 'Inactive'],
            ]),
            filter('categories', [
                ['', 'All'],
                ...categories.map((category) => [String(category.id), category.title]),
            ]),
            filter('sort', [
                ['likes', 'Likes'],
                ['date', 'Date'],
            ]),
            filter('order', [
                ['desc', 'Descending'],
                ['asc', 'Ascending'],
            ])
        ),
        listArea
    );

    async function changeStatus(post) {
        const status = post.status === 'active' ? 'inactive' : 'active';
        const { ok: updated } = await runAction(
            () => api.patch(`/posts/${post.id}`, { status }),
            status === 'inactive' ? 'Post locked' : 'Post activated'
        );
        if (updated) {
            load();
        }
    }

    async function deletePost(post) {
        if (!window.confirm(`Delete the post "${post.title}" with its comments and likes?`)) {
            return;
        }
        const { ok: deleted } = await runAction(
            () => api.delete(`/posts/${post.id}`),
            'Post deleted'
        );
        if (deleted) {
            load();
        }
    }

    async function load() {
        const { ok: loaded, result } = await runAction(() =>
            api.get('/posts', { ...state, limit: PAGE_SIZE })
        );
        if (!loaded) {
            return;
        }

        const rows = result.data.map((post) => [
            String(post.id),
            el(
                'button',
                {
                    className: 'link-button',
                    type: 'button',
                    onclick: () => openDetails(api, post.id, load),
                },
                post.title
            ),
            post.author_login,
            post.categories.map((category) => category.title).join(', '),
            likeCounts(post),
            statusBadge(post.status),
            formatDate(post.created_at),
            el(
                'div',
                { className: 'actions' },
                button(
                    post.status === 'active' ? 'Lock' : 'Activate',
                    () => changeStatus(post),
                    'secondary'
                ),
                button(
                    'Categories',
                    () => openCategoriesForm(api, post, categories, reload),
                    'secondary'
                ),
                button('Delete', () => deletePost(post), 'danger')
            ),
        ]);

        listArea.replaceChildren(
            table(
                ['ID', 'Title', 'Author', 'Categories', 'Likes', 'Status', 'Created', ''],
                rows,
                'No posts found'
            ),
            renderPagination(result.pagination, (page) => {
                state.page = page;
                load();
            })
        );
    }

    await load();
}
