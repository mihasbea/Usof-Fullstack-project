import { el, formatDate, truncate } from '../dom.js';
import {
    button,
    field,
    likeCounts,
    renderPagination,
    runAction,
    select,
    statusBadge,
    table,
} from '../ui.js';

const PAGE_SIZE = 20;

export async function renderComments(container, { api }) {
    const state = { page: 1, status: '', search: '', sort: 'date', order: 'desc' };
    const listArea = el('div');

    const searchInput = el('input', {
        type: 'search',
        name: 'search',
        placeholder: 'Search comments, posts, authors…',
        'aria-label': 'Search comments',
    });
    const statusFilter = select(
        'status',
        [
            ['', 'All'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
        ],
        state.status
    );
    const sortFilter = select(
        'sort',
        [
            ['date', 'Date'],
            ['likes', 'Likes'],
            ['post', 'Post'],
            ['author', 'Author'],
        ],
        state.sort
    );
    const orderFilter = select(
        'order',
        [
            ['desc', 'Descending'],
            ['asc', 'Ascending'],
        ],
        state.order
    );
    let searchTimer;
    const updateFilter = (key, input) => {
        input.addEventListener('change', () => {
            state[key] = input.value;
            state.page = 1;
            load();
        });
    };
    updateFilter('status', statusFilter);
    updateFilter('sort', sortFilter);
    updateFilter('order', orderFilter);
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            load();
        }, 250);
    });

    container.replaceChildren(
        el('div', { className: 'toolbar' }, el('h1', {}, 'Comments')),
        el(
            'div',
            { className: 'filters' },
            field('Search', searchInput),
            field('Status', statusFilter),
            field('Sort by', sortFilter),
            field('Order', orderFilter)
        ),
        listArea
    );

    async function changeStatus(comment) {
        const status = comment.status === 'active' ? 'inactive' : 'active';
        const { ok } = await runAction(
            () => api.patch(`/comments/${comment.id}`, { status }),
            status === 'inactive' ? 'Comment locked' : 'Comment activated'
        );
        if (ok) {
            await load();
        }
    }

    async function deleteComment(comment) {
        if (!window.confirm('Delete this comment with its likes?')) {
            return;
        }
        const { ok } = await runAction(
            () => api.delete(`/comments/${comment.id}`),
            'Comment deleted'
        );
        if (ok) {
            await load();
        }
    }

    async function load() {
        const { ok, result } = await runAction(() =>
            api.get('/comments', { ...state, limit: PAGE_SIZE })
        );
        if (!ok) {
            return;
        }

        const rows = result.data.map((comment) => [
            String(comment.id),
            truncate(comment.post_title, 60),
            comment.author_login,
            truncate(comment.content, 120),
            likeCounts(comment),
            statusBadge(comment.status),
            formatDate(comment.created_at),
            el(
                'div',
                { className: 'actions' },
                button(
                    comment.status === 'active' ? 'Lock' : 'Activate',
                    () => changeStatus(comment),
                    'secondary'
                ),
                button('Delete', () => deleteComment(comment), 'danger')
            ),
        ]);

        listArea.replaceChildren(
            table(
                ['ID', 'Post', 'Author', 'Comment', 'Likes', 'Status', 'Created', ''],
                rows,
                'No comments found'
            ),
            renderPagination(result.pagination, (page) => {
                state.page = page;
                load();
            })
        );
    }

    await load();
}
