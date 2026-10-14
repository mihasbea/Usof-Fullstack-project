import { el, formatDate } from '../dom.js';
import {
    button,
    field,
    formError,
    openModal,
    runAction,
    select,
    showToast,
    submitForm,
    table,
} from '../ui.js';

const ROLE_OPTIONS = [
    ['user', 'User'],
    ['admin', 'Admin'],
];

function textInput(name, value = '', type = 'text') {
    return el('input', { name, type, value, autocomplete: 'off' });
}

function openCreateForm(api, onSaved) {
    const inputs = {
        login: textInput('login'),
        full_name: textInput('full_name'),
        email: textInput('email', '', 'email'),
        password: textInput('password', '', 'password'),
        password_confirmation: textInput('password_confirmation', '', 'password'),
        role: select('role', ROLE_OPTIONS, 'user'),
    };
    const error = formError();

    const form = el(
        'form',
        {
            className: 'form',
            onsubmit: (event) =>
                submitForm(event, error, async () => {
                    const body = Object.fromEntries(
                        Object.entries(inputs).map(([name, input]) => [name, input.value])
                    );
                    await api.post('/users', body);
                    dialog.close();
                    onSaved('User created');
                }),
        },
        field('Login', inputs.login),
        field('Full name', inputs.full_name),
        field('Email', inputs.email),
        field('Password', inputs.password),
        field('Confirm password', inputs.password_confirmation),
        field('Role', inputs.role),
        error,
        el('button', { className: 'button button-primary', type: 'submit' }, 'Create user')
    );
    const dialog = openModal('New user', form);
}

function openEditForm(api, user, currentUser, onSaved) {
    const isSelf = user.id === currentUser.id;
    const inputs = {
        login: textInput('login', user.login),
        full_name: textInput('full_name', user.full_name),
        email: textInput('email', user.email, 'email'),
        role: select('role', ROLE_OPTIONS, user.role),
        password: textInput('password', '', 'password'),
        password_confirmation: textInput('password_confirmation', '', 'password'),
    };
    inputs.role.disabled = isSelf;
    const error = formError();

    const form = el(
        'form',
        {
            className: 'form',
            onsubmit: (event) =>
                submitForm(event, error, async () => {
                    const body = {};
                    for (const name of ['login', 'full_name', 'email', 'role']) {
                        if (inputs[name].value !== user[name] && !inputs[name].disabled) {
                            body[name] = inputs[name].value;
                        }
                    }
                    if (inputs.password.value) {
                        body.password = inputs.password.value;
                        body.password_confirmation = inputs.password_confirmation.value;
                    }
                    if (Object.keys(body).length === 0) {
                        throw new Error('Nothing has changed');
                    }

                    await api.patch(`/users/${user.id}`, body);
                    dialog.close();
                    onSaved('User updated');
                }),
        },
        field('Login', inputs.login),
        field('Full name', inputs.full_name),
        field('Email', inputs.email),
        field(isSelf ? 'Role (you cannot change your own role)' : 'Role', inputs.role),
        field('New password (optional)', inputs.password),
        field('Confirm new password', inputs.password_confirmation),
        error,
        el('button', { className: 'button button-primary', type: 'submit' }, 'Save')
    );
    const dialog = openModal(`Edit user ${user.login}`, form);
}

export async function renderUsers(container, { api, currentUser }) {
    const listArea = el('div');
    const state = { search: '', sort: 'id', order: 'asc' };
    const searchInput = el('input', {
        type: 'search',
        name: 'search',
        placeholder: 'Search users…',
        'aria-label': 'Search users',
    });
    const sortFilter = select(
        'sort',
        [
            ['id', 'ID'],
            ['login', 'Login'],
            ['full_name', 'Full name'],
            ['email', 'Email'],
            ['role', 'Role'],
            ['rating', 'Rating'],
            ['created', 'Registration date'],
        ],
        state.sort
    );
    const orderFilter = select(
        'order',
        [
            ['asc', 'Ascending'],
            ['desc', 'Descending'],
        ],
        state.order
    );
    let users = [];
    let usersLoaded = false;
    let searchTimer;
    for (const [key, input] of [
        ['sort', sortFilter],
        ['order', orderFilter],
    ]) {
        input.addEventListener('change', () => {
            state[key] = input.value;
            load();
        });
    }
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.search = searchInput.value.trim().toLocaleLowerCase();
            load();
        }, 150);
    });

    const reload = (message) => {
        users = [];
        usersLoaded = false;
        showToast(message);
        load();
    };

    container.replaceChildren(
        el(
            'div',
            { className: 'toolbar' },
            el('h1', {}, 'Users'),
            button('New user', () => openCreateForm(api, reload))
        ),
        el(
            'div',
            { className: 'filters' },
            field('Search', searchInput),
            field('Sort by', sortFilter),
            field('Order', orderFilter)
        ),
        listArea
    );

    async function deleteUser(user) {
        const question = `Delete ${user.login} with all their posts, comments, likes and files?`;
        if (!window.confirm(question)) {
            return;
        }
        const { ok } = await runAction(() => api.delete(`/users/${user.id}`), 'User deleted');
        if (ok) {
            users = [];
            usersLoaded = false;
            await load();
        }
    }

    async function load() {
        if (!usersLoaded) {
            const { ok, result } = await runAction(() => api.get('/users'));
            if (!ok) {
                return;
            }
            users = result;
            usersLoaded = true;
        }

        const filtered = users
            .filter((user) =>
                `${user.id} ${user.login} ${user.full_name} ${user.email} ${user.role}`
                    .toLocaleLowerCase()
                    .includes(state.search)
            )
            .sort((a, b) => {
                const comparison =
                    state.sort === 'id' || state.sort === 'rating'
                        ? a[state.sort] - b[state.sort]
                        : state.sort === 'created'
                          ? new Date(a.created_at) - new Date(b.created_at)
                          : String(a[state.sort] ?? '').localeCompare(String(b[state.sort] ?? ''));
                return state.order === 'asc' ? comparison : -comparison;
            });

        const rows = filtered.map((user) => [
            String(user.id),
            user.login,
            user.full_name,
            user.email,
            user.role,
            String(user.rating),
            formatDate(user.created_at),
            el(
                'div',
                { className: 'actions' },
                button('Edit', () => openEditForm(api, user, currentUser, reload), 'secondary'),
                user.id !== currentUser.id && button('Delete', () => deleteUser(user), 'danger')
            ),
        ]);

        listArea.replaceChildren(
            table(
                ['ID', 'Login', 'Full name', 'Email', 'Role', 'Rating', 'Registered', ''],
                rows,
                'No users found'
            )
        );
    }

    await load();
}
