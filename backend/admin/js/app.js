import { ApiClient } from './api.js';
import { el } from './dom.js';
import { button, showToast, statusBadge } from './ui.js';
import { renderCategories } from './views/categories.js';
import { renderComments } from './views/comments.js';
import { renderLogin } from './views/login.js';
import { renderPosts } from './views/posts.js';
import { renderUsers } from './views/users.js';

function asList(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (!value || typeof value !== 'object') {
        return [];
    }
    for (const key of ['data', 'posts', 'users', 'comments', 'categories', 'items', 'results']) {
        if (Array.isArray(value[key])) {
            return value[key];
        }
    }
    return [];
}

function renderUserAvatar(user, size = 'md') {
    const fallback = (user?.full_name || user?.login || 'U').trim().charAt(0).toUpperCase();
    const palette = ['#f2c14e', '#ff9f43', '#4ecdc4', '#ff6b6b', '#7d6bff', '#00b894'];
    const color = palette[(fallback.charCodeAt(0) || 1) % palette.length];

    if (user?.profile_picture) {
        return el('img', {
            className: `user-avatar avatar-${size}`,
            src: user.profile_picture,
            alt: user.login || 'User avatar',
            referrerPolicy: 'no-referrer',
        });
    }

    return el(
        'div',
        {
            className: `user-avatar avatar-fallback avatar-${size}`,
            title: user?.login || 'User',
            style: `background:${color};`,
        },
        fallback
    );
}

function statCard(label, value, hint, tone) {
    return el(
        'div',
        { className: `metric-card metric-${tone}` },
        el('span', { className: 'metric-label' }, label),
        el('strong', { className: 'metric-value' }, value),
        el('span', { className: 'metric-hint' }, hint)
    );
}

function renderOverview(container, { api }) {
    let disposed = false;
    let refreshing = false;
    let refreshQueued = false;
    let refreshErrorShown = false;

    async function refresh() {
        if (disposed) {
            return;
        }
        if (refreshing) {
            refreshQueued = true;
            return;
        }
        refreshing = true;

        try {
            const [
                postsRes,
                activePostsRes,
                inactivePostsRes,
                usersRes,
                commentsRes,
                categoriesRes,
            ] = await Promise.all([
                api.get('/posts', { limit: 4, page: 1, sort: 'date', order: 'desc' }),
                api.get('/posts', { limit: 1, page: 1, status: 'active' }),
                api.get('/posts', { limit: 1, page: 1, status: 'inactive' }),
                api.get('/users'),
                api.get('/comments', { limit: 4, page: 1, sort: 'date', order: 'desc' }),
                api.get('/categories'),
            ]);

            if (!disposed) {
                renderOverviewData(container, {
                    posts: asList(postsRes),
                    activePosts: activePostsRes.pagination.total_posts,
                    inactivePosts: inactivePostsRes.pagination.total_posts,
                    users: asList(usersRes),
                    comments: asList(commentsRes),
                    totalComments: commentsRes.pagination.total_comments,
                    categories: asList(categoriesRes),
                });
                refreshErrorShown = false;
            }
        } catch (error) {
            if (!disposed && !refreshErrorShown) {
                showToast(`Overview could not be refreshed: ${error.message}`, 'error');
                refreshErrorShown = true;
            }
        } finally {
            refreshing = false;
            if (refreshQueued && !disposed) {
                refreshQueued = false;
                void refresh();
            }
        }
    }

    const onDataChanged = () => void refresh();
    const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            void refresh();
        }
    };
    window.addEventListener('usof:data-changed', onDataChanged);
    window.addEventListener('focus', onDataChanged);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const refreshTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
            void refresh();
        }
    }, 5000);

    void refresh();
    return () => {
        disposed = true;
        window.clearInterval(refreshTimer);
        window.removeEventListener('usof:data-changed', onDataChanged);
        window.removeEventListener('focus', onDataChanged);
        document.removeEventListener('visibilitychange', onVisibilityChange);
    };
}

function renderOverviewData(
    container,
    { posts, activePosts, inactivePosts, users, comments, totalComments, categories }
) {
    const adminUsers = users.filter((user) => user.role === 'admin').length;
    const recentPosts = posts;
    const recentUsers = [...users].sort((a, b) => b.id - a.id).slice(0, 4);
    const recentComments = comments;
    const recentPanels = el('div', { className: 'panel-grid' });

    recentPanels.replaceChildren(
        el(
            'section',
            { className: 'panel' },
            el('div', { className: 'panel-header' }, el('h2', {}, 'Recent posts')),
            el(
                'div',
                { className: 'list-stack' },
                recentPosts.length
                    ? recentPosts.map((post) =>
                          el(
                              'div',
                              { className: 'list-row' },
                              el(
                                  'div',
                                  { className: 'list-copy' },
                                  el('strong', {}, post.title || 'Untitled post'),
                                  el('span', { className: 'muted' }, post.author_login || 'System')
                              ),
                              statusBadge(post.status || 'active')
                          )
                      )
                    : el('p', { className: 'empty' }, 'No posts yet')
            )
        ),
        el(
            'section',
            { className: 'panel' },
            el('div', { className: 'panel-header' }, el('h2', {}, 'Recent users')),
            el(
                'div',
                { className: 'list-stack' },
                recentUsers.length
                    ? recentUsers.map((user) =>
                          el(
                              'div',
                              { className: 'list-row' },
                              el(
                                  'div',
                                  { className: 'list-copy' },
                                  el('strong', {}, user.login || user.full_name || 'Unknown user'),
                                  el('span', { className: 'muted' }, user.email || 'No email')
                              ),
                              el(
                                  'span',
                                  {
                                      className: `badge badge-${user.role === 'admin' ? 'admin' : 'user'}`,
                                  },
                                  user.role || 'user'
                              )
                          )
                      )
                    : el('p', { className: 'empty' }, 'No users yet')
            )
        ),
        el(
            'section',
            { className: 'panel' },
            el('div', { className: 'panel-header' }, el('h2', {}, 'Recent comments')),
            el(
                'div',
                { className: 'list-stack' },
                recentComments.length
                    ? recentComments.map((comment) =>
                          el(
                              'div',
                              { className: 'list-row' },
                              el(
                                  'div',
                                  { className: 'list-copy' },
                                  el('strong', {}, comment.author_login || 'Unknown'),
                                  el(
                                      'span',
                                      { className: 'muted' },
                                      (comment.content || '').slice(0, 48) || 'No content'
                                  )
                              ),
                              statusBadge(comment.status || 'active')
                          )
                      )
                    : el('p', { className: 'empty' }, 'No comments yet')
            )
        )
    );

    const dashboard = el(
        'div',
        { className: 'dashboard' },
        el(
            'div',
            { className: 'page-header compact' },
            el('div', {}, el('h1', {}, 'Administration dashboard'))
        ),
        el(
            'div',
            { className: 'dashboard-grid' },
            statCard('Total posts', activePosts + inactivePosts, 'Across the platform', 'primary'),
            statCard('Active posts', activePosts, `${inactivePosts} inactive`, 'success'),
            statCard('Users', users.length, `${adminUsers} admins`, 'warning'),
            statCard('Comments', totalComments, `${categories.length} categories`, 'accent')
        ),
        recentPanels
    );

    container.replaceChildren(dashboard);
}

const VIEWS = {
    overview: { title: 'Overview', render: renderOverview },
    posts: { title: 'Posts', render: renderPosts },
    categories: { title: 'Categories', render: renderCategories },
    comments: { title: 'Comments', render: renderComments },
    users: { title: 'Users', render: renderUsers },
};
const DEFAULT_VIEW = 'overview';

const api = new ApiClient('/api');
const root = document.getElementById('app');
let disposeCurrentView;

async function loadCurrentAdmin() {
    const userId = api.getTokenUserId();
    const user = await api.get(`/users/${userId}`);
    if (user.role !== 'admin') {
        await api.post('/auth/logout').catch(() => {});
        api.setToken(null);
        throw new Error('This account does not have admin access');
    }
    return user;
}

function showLogin() {
    disposeCurrentView?.();
    disposeCurrentView = null;
    window.onhashchange = null;
    for (const dialog of document.querySelectorAll('dialog[open]')) {
        dialog.close();
    }
    renderLogin(root, {
        api,
        onLogin: async (token) => {
            api.setToken(token);
            const user = await loadCurrentAdmin();
            showDashboard(user);
        },
    });
}

async function logout() {
    await api.post('/auth/logout').catch(() => {});
    api.setToken(null);
    showLogin();
}

function showDashboard(currentUser) {
    const content = el('main', { className: 'content' });
    const tabs = Object.entries(VIEWS).map(([name, view]) =>
        el('a', { className: 'tab', href: `#${name}`, dataset: { view: name } }, view.title)
    );

    root.replaceChildren(
        el(
            'div',
            { className: 'layout' },
            el(
                'aside',
                { className: 'sidebar' },
                el(
                    'div',
                    { className: 'brand-block' },
                    el(
                        'div',
                        { className: 'brand-logo' },
                        'USOF',
                        el('span', { className: 'brand-logo-end' }, ';')
                    )
                ),
                el(
                    'div',
                    { className: 'sidebar-user' },
                    renderUserAvatar(currentUser, 'lg'),
                    el(
                        'div',
                        { className: 'sidebar-user-copy' },
                        el('strong', {}, 'USOF admin'),
                        el('span', {}, currentUser.login)
                    )
                ),
                el('nav', { className: 'sidebar-nav' }, tabs),
                el('div', { className: 'sidebar-footer' }, button('Log out', logout, 'secondary'))
            ),
            el(
                'div',
                { className: 'main-panel' },
                el(
                    'header',
                    { className: 'topbar' },
                    el('div', {}, el('h2', {}, 'Control center')),
                    el('div', { className: 'account' }, button('Log out', logout, 'secondary'))
                ),
                content
            )
        )
    );

    const showView = () => {
        const requested = window.location.hash.slice(1);
        const name = requested in VIEWS ? requested : DEFAULT_VIEW;
        for (const tab of tabs) {
            tab.classList.toggle('active', tab.dataset.view === name);
        }
        disposeCurrentView?.();
        disposeCurrentView = null;
        content.replaceChildren();
        const dispose = VIEWS[name].render(content, { api, currentUser });
        if (typeof dispose === 'function') {
            disposeCurrentView = dispose;
        }
    };

    window.onhashchange = showView;
    showView();
}

api.onUnauthorized = () => {
    api.setToken(null);
    showToast('Your session has ended, please log in again', 'error');
    showLogin();
};

async function start() {
    if (!api.token) {
        showLogin();
        return;
    }
    try {
        showDashboard(await loadCurrentAdmin());
    } catch {
        api.setToken(null);
        showLogin();
    }
}

start();
