import { el } from '../dom.js';
import {
    button,
    field,
    formError,
    openModal,
    runAction,
    showToast,
    submitForm,
    table,
} from '../ui.js';

function openEditForm(api, category, onSaved) {
    const title = el('input', {
        name: 'title',
        required: true,
        maxlength: 255,
        value: category.title,
    });
    const description = el(
        'textarea',
        { name: 'description', rows: 4, maxlength: 1000 },
        category.description ?? ''
    );
    const error = formError();

    const form = el(
        'form',
        {
            className: 'form',
            onsubmit: (event) =>
                submitForm(event, error, async () => {
                    await api.patch(`/categories/${category.id}`, {
                        title: title.value,
                        description: description.value.trim() || null,
                    });
                    dialog.close();
                    onSaved();
                }),
        },
        field('Title', title),
        field('Description', description),
        error,
        el('button', { className: 'button button-primary', type: 'submit' }, 'Save')
    );
    const dialog = openModal(`Edit category #${category.id}`, form);
}

export async function renderCategories(container, { api }) {
    const listArea = el('div');
    const state = { search: '', sort: 'title', order: 'asc' };
    const searchInput = el('input', {
        type: 'search',
        name: 'search',
        placeholder: 'Search categories…',
        'aria-label': 'Search categories',
    });
    const sortFilter = el(
        'select',
        { name: 'sort' },
        [
            ['title', 'Title'],
            ['id', 'ID'],
            ['created', 'Created'],
        ].map(([value, label]) => el('option', { value }, label))
    );
    const orderFilter = el(
        'select',
        { name: 'order' },
        [
            ['asc', 'Ascending'],
            ['desc', 'Descending'],
        ].map(([value, label]) => el('option', { value }, label))
    );
    let categories = [];
    let categoriesLoaded = false;
    let searchTimer;
    const updateState = (key, input) => {
        input.addEventListener('change', () => {
            state[key] = input.value;
            load();
        });
    };
    updateState('sort', sortFilter);
    updateState('order', orderFilter);
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.search = searchInput.value.trim().toLocaleLowerCase();
            load();
        }, 150);
    });
    const title = el('input', { name: 'title', required: true, maxlength: 255 });
    const description = el('input', { name: 'description', maxlength: 1000 });
    const error = formError();

    const createForm = el(
        'form',
        {
            className: 'inline-form',
            onsubmit: (event) =>
                submitForm(event, error, async () => {
                    await api.post('/categories', {
                        title: title.value,
                        description: description.value.trim() || null,
                    });
                    createForm.reset();
                    showToast('Category created');
                    await load(true);
                }),
        },
        field('Title', title),
        field('Description', description),
        el('button', { className: 'button button-primary', type: 'submit' }, 'Create'),
        error
    );

    container.replaceChildren(
        el('div', { className: 'toolbar' }, el('h1', {}, 'Categories')),
        createForm,
        el(
            'div',
            { className: 'filters' },
            field('Search', searchInput),
            field('Sort by', sortFilter),
            field('Order', orderFilter)
        ),
        listArea
    );

    async function deleteCategory(category) {
        const question = `Delete the category "${category.title}"? Its posts stay, and their authors get a notification with suggested categories.`;
        if (!window.confirm(question)) {
            return;
        }
        const { ok } = await runAction(
            () => api.delete(`/categories/${category.id}`),
            (result) =>
                `Category deleted: ${result.affected_posts} post(s) affected, ${result.notified_users} user(s) notified`
        );
        if (ok) {
            await load(true);
        }
    }

    async function load(refresh = false) {
        if (refresh || !categoriesLoaded) {
            const { ok, result } = await runAction(() => api.get('/categories'));
            if (!ok) {
                return;
            }
            categories = result;
            categoriesLoaded = true;
        }

        const filtered = categories
            .filter((category) =>
                `${category.title} ${category.description ?? ''}`
                    .toLocaleLowerCase()
                    .includes(state.search)
            )
            .sort((a, b) => {
                const comparison =
                    state.sort === 'id'
                        ? a.id - b.id
                        : state.sort === 'created'
                          ? new Date(a.created_at) - new Date(b.created_at)
                          : a.title.localeCompare(b.title);
                return state.order === 'asc' ? comparison : -comparison;
            });

        const rows = filtered.map((category) => [
            String(category.id),
            category.title,
            category.description ?? '—',
            el(
                'div',
                { className: 'actions' },
                button(
                    'Edit',
                    () =>
                        openEditForm(api, category, () => {
                            showToast('Category updated');
                            load(true);
                        }),
                    'secondary'
                ),
                button('Delete', () => deleteCategory(category), 'danger')
            ),
        ]);

        listArea.replaceChildren(
            table(['ID', 'Title', 'Description', ''], rows, 'No categories found')
        );
    }

    await load();
}
