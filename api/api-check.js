#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function loadEnvFile() {
    const file = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(file)) {
        return null;
    }

    const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    for (const line of text.split(/\r?\n/)) {
        if (line.trim().startsWith('#')) continue;
        const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (!m) continue;
        let value = m[2];
        if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
        if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
    return file;
}
const ENV_FILE = loadEnvFile();
const env = process.env;

const CFG = {
    base: (env.BASE_URL || 'http://localhost:3000/api').replace(/\/$/, ''),
    accounts: {
        admin: { login: env.ADMIN_LOGIN, password: env.ADMIN_PASSWORD, email: env.ADMIN_EMAIL },
        user1: { login: env.USER_LOGIN, password: env.USER_PASSWORD, email: env.USER_EMAIL },
        user2: { login: env.USER2_LOGIN, password: env.USER2_PASSWORD, email: env.USER2_EMAIL },
    },
    names: {
        confirm: env.CONFIRM_FIELD || 'passwordConfirmation',
        fullName: env.FULLNAME_FIELD || 'fullName',
        avatar: env.AVATAR_FIELD || 'avatar',
        newPassword: env.NEWPASS_FIELD || 'password',
    },
    query: {
        page: 'page',
        limit: 'limit',
        sort: 'sort',
        sortLikes: 'likes',
        sortDate: 'date',
        categories: 'categories',
        dateFrom: 'date_from',
        dateTo: 'date_to',
        status: 'status',
    },
};
const Q = CFG.query;

const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
);

const stats = {
    requests: 0,
    serverErrors: [],
    uninformative: new Set(),
    record(method, path, r) {
        this.requests++;
        if (r.status >= 500) this.serverErrors.push(`${method} ${path} -> ${r.status}`);
        if (r.status >= 400 && r.status < 500) {
            const j = r.json;
            const informative = j && typeof j === 'object' && (j.message || j.error || j.errors);
            if (!informative) this.uninformative.add(`${method} ${path} -> ${r.status}`);
        }
    },
};

class Client {
    constructor(name) {
        this.name = name;
        this.token = null;
        this.cookies = new Map();
    }

    async request(method, path, { body, form, raw } = {}) {
        const headers = {};
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        if (this.cookies.size) {
            headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
        }
        let payload;
        if (form) {
            payload = form;
        } else if (raw !== undefined) {
            headers['Content-Type'] = 'application/json';
            payload = raw;
        } else if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
            payload = JSON.stringify(body);
        }

        let res;
        try {
            res = await fetch(CFG.base + path, { method, headers, body: payload });
        } catch (e) {
            throw new Error(`Network error on ${method} ${path}: ${e.message}`, { cause: e });
        }

        const setCookies =
            typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
        for (const c of setCookies) {
            const [pair] = c.split(';');
            const i = pair.indexOf('=');
            const key = pair.slice(0, i).trim();
            const value = pair.slice(i + 1).trim();
            if (value) this.cookies.set(key, value);
            else this.cookies.delete(key);
        }

        const text = await res.text();
        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch (error) {
            if (!(error instanceof SyntaxError)) throw error;
        }
        const out = { status: res.status, json, text };
        stats.record(method, path, out);
        return out;
    }

    get(p) {
        return this.request('GET', p);
    }
    post(p, body) {
        return this.request('POST', p, { body });
    }
    patch(p, body) {
        return this.request('PATCH', p, { body });
    }
    del(p) {
        return this.request('DELETE', p);
    }
}

const results = [];
let currentSection = '';

function section(title) {
    currentSection = title;
    console.log(`\n== ${title} ==`);
}

async function test(name, fn, { soft = false } = {}) {
    try {
        await fn();
        results.push({ section: currentSection, name, ok: true });
        console.log(`  \u2714 ${name}`);
    } catch (e) {
        if (String(e.message).startsWith('skipped:')) {
            results.push({
                section: currentSection,
                name,
                ok: false,
                skipped: true,
                msg: e.message,
            });
            console.log(`  \u21B7 ${name} (${e.message})`);
            return;
        }
        results.push({ section: currentSection, name, ok: false, soft, msg: e.message });
        console.log(`  ${soft ? '\u26A0' : '\u2718'} ${name}\n      ${e.message}`);
    }
}

const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
};
const need = (v, what) => {
    if (v === undefined || v === null) throw new Error(`skipped: ${what}`);
};

function expectStatus(r, allowed, label = '') {
    const list = [].concat(allowed);
    assert(
        list.includes(r.status),
        `${label}expected ${list.join(' / ')}, got ${r.status}: ${r.text.slice(0, 200)}`
    );
}

function expectClientError(r, label = '') {
    assert(
        r.status >= 400 && r.status < 500 && r.status !== 401,
        `${label}expected a 4xx rejection (not 401), got ${r.status}: ${r.text.slice(0, 200)}`
    );
}

const qs = (obj) => {
    const p = new URLSearchParams(obj).toString();
    return p ? `?${p}` : '';
};
const enc = encodeURIComponent;
const iso = (d) => d.toISOString().slice(0, 10);

const pickId = (j, kind) => {
    if (!j || typeof j !== 'object') return undefined;
    const keys = ['id', 'insertId', 'insert_id'];
    if (kind) keys.push(`${kind}Id`, `${kind}_id`);
    for (const x of [j, j.data, j.post, j.comment, j.user, j.category, j.like, j.result]) {
        if (!x || typeof x !== 'object') continue;
        for (const k of keys) if (x[k] !== undefined) return x[k];
    }
    return undefined;
};

const LIST_KEYS = [
    'data',
    'posts',
    'items',
    'results',
    'rows',
    'comments',
    'likes',
    'categories',
    'users',
];
const pickList = (j) => {
    if (Array.isArray(j)) return j;
    if (!j || typeof j !== 'object') return null;
    for (const k of LIST_KEYS) {
        if (Array.isArray(j[k])) return j[k];
        if (j.data && Array.isArray(j.data[k])) return j.data[k];
    }
    return null;
};

const pickToken = (j) =>
    j &&
    (j.token ||
        j.accessToken ||
        j.access_token ||
        (j.data && (j.data.token || j.data.accessToken)));

const findField = (j, key) => {
    if (!j || typeof j !== 'object') return undefined;
    for (const x of [j, j.data, j.user]) {
        if (x && typeof x === 'object' && x[key] !== undefined) return x[key];
    }
    return undefined;
};

const hasKey = (obj, keys) => {
    if (!obj || typeof obj !== 'object') return false;
    return Object.entries(obj).some(([k, v]) => keys.includes(k.toLowerCase()) || hasKey(v, keys));
};

const containsId = (list, id) =>
    Array.isArray(list) && list.some((x) => String(x.id) === String(id));

async function loginAs(client, acct) {
    const body = { login: acct.login, password: acct.password };
    if (acct.email) body.email = acct.email;
    const r = await client.post('/auth/login', body);
    expectStatus(r, [200, 201], 'login: ');
    const token = pickToken(r.json);
    if (token) client.token = token;
    assert(
        token || client.cookies.size > 0,
        'login returned neither a token in JSON nor a session cookie'
    );
}

async function main() {
    const required = [
        ['ADMIN_LOGIN', CFG.accounts.admin.login],
        ['ADMIN_PASSWORD', CFG.accounts.admin.password],
        ['USER_LOGIN', CFG.accounts.user1.login],
        ['USER_PASSWORD', CFG.accounts.user1.password],
        ['USER2_LOGIN', CFG.accounts.user2.login],
        ['USER2_PASSWORD', CFG.accounts.user2.password],
    ];
    const missingVars = required.filter(([, v]) => !v).map(([k]) => k);
    if (missingVars.length) {
        console.error(`Missing variables: ${missingVars.join(', ')}`);
        console.error(
            ENV_FILE
                ? `Read ${ENV_FILE}, but these names are not in it. Names are case-sensitive, one KEY=value per line.`
                : `No root .env found.\nCopy .env.example to .env in the repository root, fill in the API smoke-check credentials and run again.`
        );
        process.exit(2);
    }
    const placeholders = required
        .filter(([k, v]) => k.endsWith('PASSWORD') && /^(ПАРОЛЬ|PASSWORD|\.\.\.|<.*>)$/i.test(v))
        .map(([k]) => k);
    if (placeholders.length) {
        console.error(
            `${placeholders.join(', ')} still contain a placeholder. Put the real seed password there.`
        );
        process.exit(2);
    }
    console.log(`API:    ${CFG.base}\nconfig: ${ENV_FILE || 'process environment'}`);

    const anon = new Client('anon');
    const admin = new Client('admin');
    const u1 = new Client('user1');
    const u2 = new Client('user2');
    const rnd = Math.random().toString(36).slice(2, 8);
    const ctx = {};

    try {
        await anon.get('/posts');
    } catch (e) {
        console.error(
            `Cannot reach ${CFG.base}: ${e.message}\nIs the server running and BASE_URL correct?`
        );
        process.exit(2);
    }

    const userIdByLogin = async (login) => {
        const r = await admin.get(`/users${qs({ [Q.limit]: 100 })}`);
        const u = (pickList(r.json) || []).find((x) => x.login === login);
        return u && u.id;
    };
    const findIdBy = async (client, listPath, field, value) => {
        const r = await client.get(listPath);
        const hit = (pickList(r.json) || []).find((x) => x && x[field] === value);
        return hit ? hit.id : undefined;
    };
    const likesOf = async (client, kind, id) => {
        const r = await client.get(`/${kind}/${enc(id)}/like`);
        expectStatus(r, 200, 'get likes: ');
        const list = pickList(r.json);
        assert(Array.isArray(list), 'likes response is not a list');
        return list;
    };
    const ratingOf = async (userId) => {
        const r = await admin.get(`/users/${enc(userId)}`);
        expectStatus(r, 200, 'get user: ');
        const v = Number(findField(r.json, 'rating'));
        assert(!Number.isNaN(v), 'user has no numeric "rating" field');
        return v;
    };

    section('Authentication');

    await test('register: password confirmation mismatch is rejected', async () => {
        const r = await anon.post('/auth/register', {
            login: `chk_${rnd}`,
            password: 'Passw0rd!1',
            [CFG.names.fullName]: 'Check Bot',
            [CFG.names.confirm]: 'different',
            email: `chk_${rnd}@example.com`,
        });
        expectStatus(r, [400, 422]);
    });

    await test('register: missing e-mail is rejected', async () => {
        const r = await anon.post('/auth/register', {
            login: `chk2_${rnd}`,
            password: 'Passw0rd!1',
            [CFG.names.fullName]: 'Check Bot',
            [CFG.names.confirm]: 'Passw0rd!1',
        });
        expectStatus(r, [400, 422]);
    });

    await test('register: duplicate login is rejected', async () => {
        const r = await anon.post('/auth/register', {
            login: CFG.accounts.user1.login,
            password: 'Passw0rd!1',
            [CFG.names.fullName]: 'Check Bot',
            [CFG.names.confirm]: 'Passw0rd!1',
            email: `dup_${rnd}@example.com`,
        });
        expectStatus(r, [400, 409, 422]);
    });

    await test(
        'register: valid data creates a user, but login is blocked until e-mail is confirmed',
        async () => {
            const login = `chk3_${rnd}`;
            const r = await anon.post('/auth/register', {
                login,
                password: 'Passw0rd!1',
                [CFG.names.fullName]: 'Check Bot',
                [CFG.names.confirm]: 'Passw0rd!1',
                email: `${login}@example.com`,
            });
            expectStatus(r, [200, 201], 'register: ');
            ctx.regLogin = login;
            const l = await anon.post('/auth/login', {
                login,
                email: `${login}@example.com`,
                password: 'Passw0rd!1',
            });
            expectStatus(l, [400, 401, 403], 'unconfirmed login must fail: ');
        },
        { soft: true }
    );

    await test('login: wrong password is rejected', async () => {
        const r = await anon.post('/auth/login', {
            login: CFG.accounts.user1.login,
            password: 'definitely-wrong',
        });
        expectStatus(r, [400, 401, 403]);
    });

    await test('login: SQL-injection attempt does not log in and does not crash', async () => {
        const r = await anon.post('/auth/login', { login: "' OR '1'='1", password: "' OR '1'='1" });
        assert(r.status !== 200 && r.status < 500, `got ${r.status}`);
    });

    await test('login: admin, user1, user2', async () => {
        await loginAs(admin, CFG.accounts.admin);
        await loginAs(u1, CFG.accounts.user1);
        await loginAs(u2, CFG.accounts.user2);
    });

    await test('password-reset: missing e-mail is rejected', async () => {
        expectStatus(await anon.post('/auth/password-reset', {}), [400, 422]);
    });

    await test('password-reset/:token: invalid token is rejected', async () => {
        const p = 'N3wPassw0rd!';
        const r = await anon.post('/auth/password-reset/not-a-real-token', {
            [CFG.names.newPassword]: p,
            [`${CFG.names.newPassword}_confirmation`]: p,
            password: p,
            newPassword: p,
            new_password: p,
            new_password_confirmation: p,
        });
        expectStatus(r, [400, 401, 403, 404, 410, 422]);
        const msg = JSON.stringify(r.json || '').toLowerCase();
        assert(
            msg.includes('token') || msg.includes('link') || msg.includes('expired'),
            `rejected, but the message does not mention the token (is the body validation failing first?): ${r.text.slice(0, 200)}`
        );
    });

    section('Public access and route protection');

    await test('GET /posts is public and returns a list', async () => {
        const r = await anon.get('/posts');
        expectStatus(r, 200);
        assert(Array.isArray(pickList(r.json)), 'cannot find an array of posts in the response');
    });

    await test(
        'GET /posts: pagination limits page size',
        async () => {
            const r = await anon.get(`/posts${qs({ [Q.page]: 1, [Q.limit]: 2 })}`);
            expectStatus(r, 200);
            const list = pickList(r.json);
            assert(
                Array.isArray(list) && list.length <= 2,
                `got ${list ? list.length : 'no'} items for limit=2`
            );
        },
        { soft: true }
    );

    await test('GET /posts/:id for a missing post -> 404', async () => {
        expectStatus(await anon.get('/posts/999999999'), 404);
    });

    await test('GET /posts/abc (bad id) -> 4xx, not 500', async () => {
        const r = await anon.get('/posts/abc');
        assert(r.status >= 400 && r.status < 500, `got ${r.status}`);
    });

    await test('malformed JSON body -> 400, not 500', async () => {
        const r = await u1.request('POST', '/posts', { raw: '{bad json' });
        expectStatus(r, 400);
    });

    await test('POST /posts without auth -> 401', async () => {
        expectStatus(
            await anon.post('/posts', { title: 't', content: 'c', categories: [] }),
            [401, 403]
        );
    });

    await test('POST /categories without auth -> 401', async () => {
        expectStatus(await anon.post('/categories', { title: 'x' }), [401, 403]);
    });

    section('Roles and users');

    await test(
        'admin sees the seeded users (>= 5)',
        async () => {
            const r = await admin.get('/users');
            expectStatus(r, 200);
            const list = pickList(r.json);
            assert(
                Array.isArray(list) && list.length >= 5,
                `found ${list ? list.length : 0} users`
            );
        },
        { soft: true }
    );

    await test('resolve ids of user1 / user2 via admin', async () => {
        ctx.u1Id = await userIdByLogin(CFG.accounts.user1.login);
        ctx.u2Id = await userIdByLogin(CFG.accounts.user2.login);
        need(ctx.u1Id, 'user1 id');
        need(ctx.u2Id, 'user2 id');
    });

    await test('user profile does not leak password / hash', async () => {
        need(ctx.u1Id, 'user1 id');
        const r = await admin.get(`/users/${enc(ctx.u1Id)}`);
        expectStatus(r, 200);
        assert(
            !hasKey(r.json, ['password', 'passwordhash', 'password_hash', 'hash']),
            'response contains a password field'
        );
    });

    await test('regular user cannot create users (POST /users) -> 403', async () => {
        const r = await u1.post('/users', {
            login: `x_${rnd}`,
            password: 'Passw0rd!1',
            [CFG.names.fullName]: 'Check Bot',
            [CFG.names.confirm]: 'Passw0rd!1',
            email: `x_${rnd}@example.com`,
            role: 'user',
        });
        expectStatus(r, 403);
    });

    await test('admin can create users (POST /users)', async () => {
        const login = `adm_${rnd}`;
        const r = await admin.post('/users', {
            login,
            password: 'Passw0rd!1',
            [CFG.names.fullName]: 'Check Bot',
            [CFG.names.confirm]: 'Passw0rd!1',
            email: `${login}@example.com`,
            role: 'user',
        });
        if (![200, 201].includes(r.status)) {
            throw new Error(
                `expected 200 / 201, got ${r.status}: ${r.text.slice(0, 200)}\n      Hint: set FULLNAME_FIELD / CONFIRM_FIELD in the root .env to the field names your controller really expects.`
            );
        }
        ctx.adminCreatedId = pickId(r.json, 'user') ?? (await userIdByLogin(login));
    });

    await test("user cannot edit another user's profile -> 403", async () => {
        need(ctx.u2Id, 'user2 id');
        expectStatus(
            await u1.patch(`/users/${enc(ctx.u2Id)}`, { [CFG.names.fullName]: 'Hacked' }),
            403
        );
    });

    await test('user cannot delete another user -> 403', async () => {
        need(ctx.u2Id, 'user2 id');
        expectStatus(await u1.del(`/users/${enc(ctx.u2Id)}`), 403);
    });

    await test('user cannot make himself admin', async () => {
        need(ctx.u1Id, 'user1 id');
        await u1.patch(`/users/${enc(ctx.u1Id)}`, { role: 'admin' });
        const r = await admin.get(`/users/${enc(ctx.u1Id)}`);
        assert(findField(r.json, 'role') !== 'admin', 'user1 became admin!');
    });

    await test('avatar upload: PATCH /users/avatar accepts an image', async () => {
        const form = new FormData();
        form.append(CFG.names.avatar, new Blob([PNG_1X1], { type: 'image/png' }), 'a.png');
        expectStatus(await u1.request('PATCH', '/users/avatar', { form }), [200, 201]);
    });

    await test(
        'avatar upload: a non-image file is rejected',
        async () => {
            const form = new FormData();
            form.append(
                CFG.names.avatar,
                new Blob(['not an image'], { type: 'text/plain' }),
                'a.txt'
            );
            expectStatus(await u1.request('PATCH', '/users/avatar', { form }), [400, 415, 422]);
        },
        { soft: true }
    );

    section('Categories');

    await test('user creates and manages an owned category', async () => {
        const title = `user_cat_${rnd}`;
        const created = await u1.post('/categories', { title });
        expectStatus(created, [200, 201]);
        ctx.userCatId = pickId(created.json, 'category');
        assert(ctx.userCatId !== undefined, 'created category has no id');

        const ownCategories = await u1.get(`/users/${enc(ctx.u1Id)}/categories`);
        expectStatus(ownCategories, 200);
        assert(containsId(pickList(ownCategories.json), ctx.userCatId), 'owned category is missing');

        expectStatus(
            await u1.patch(`/categories/${enc(ctx.userCatId)}`, { description: 'owned category' }),
            200
        );
        expectStatus(await u2.patch(`/categories/${enc(ctx.userCatId)}`, { title: 'hack' }), 403);
        expectStatus(await u2.del(`/categories/${enc(ctx.userCatId)}`), 403);
        expectStatus(await u1.del(`/categories/${enc(ctx.userCatId)}`), [200, 204]);
    });

    await test('admin: category without title is rejected', async () => {
        expectStatus(await admin.post('/categories', { description: 'no title' }), [400, 422]);
    });

    await test('admin creates a category', async () => {
        const r = await admin.post('/categories', {
            title: `cat_${rnd}`,
            description: 'created by api-check',
        });
        expectStatus(r, [200, 201]);
        ctx.catId =
            pickId(r.json, 'category') ??
            (await findIdBy(anon, '/categories', 'title', `cat_${rnd}`));
        assert(
            ctx.catId !== undefined,
            `category created (${r.status}) but no id in the response and not found in GET /categories. Response: ${r.text.slice(0, 200)}`
        );
    });

    await test('GET /categories and /categories/:id', async () => {
        need(ctx.catId, 'category id');
        const all = await anon.get('/categories');
        expectStatus(all, 200);
        assert(containsId(pickList(all.json), ctx.catId), 'new category is not in the list');
        expectStatus(await anon.get(`/categories/${enc(ctx.catId)}`), 200);
    });

    await test('admin updates the category; user cannot', async () => {
        need(ctx.catId, 'category id');
        expectStatus(await u1.patch(`/categories/${enc(ctx.catId)}`, { title: 'hack' }), 403);
        expectStatus(
            await admin.patch(`/categories/${enc(ctx.catId)}`, { description: 'updated' }),
            200
        );
    });

    section('Posts');

    await test('user: post without title is rejected', async () => {
        expectStatus(
            await u1.post('/posts', { content: 'c', categories: [ctx.catId] }),
            [400, 422]
        );
    });

    await test(
        'user: post with a non-existent category is rejected',
        async () => {
            expectStatus(
                await u1.post('/posts', { title: 't', content: 'c', categories: [999999999] }),
                [400, 404, 422]
            );
        },
        { soft: true }
    );

    await test('user creates a post with a category', async () => {
        need(ctx.catId, 'category id');
        const title = `Post ${rnd}`;
        const r = await u1.post('/posts', {
            title,
            content: 'Body of the check post',
            categories: [ctx.catId],
        });
        expectStatus(r, [200, 201]);
        ctx.postId =
            pickId(r.json, 'post') ??
            (await findIdBy(u1, `/posts${qs({ [Q.limit]: 100 })}`, 'title', title));
        assert(
            ctx.postId !== undefined,
            `post created (${r.status}) but no id in the response and not found in GET /posts. Response: ${r.text.slice(0, 200)}. Tip: return the created post (with "id") from POST /posts.`
        );
    });

    await test('author profile lists own posts', async () => {
        need(ctx.u1Id, 'user1 id');
        need(ctx.postId, 'post id');
        const r = await u1.get(`/users/${enc(ctx.u1Id)}/posts`);
        expectStatus(r, 200);
        assert(containsId(pickList(r.json), ctx.postId), 'own post is missing from profile posts');
        expectStatus(await u2.get(`/users/${enc(ctx.u1Id)}/posts`), 403);
    });

    await test('post is publicly readable, with its categories', async () => {
        need(ctx.postId, 'post id');
        expectStatus(await anon.get(`/posts/${enc(ctx.postId)}`), 200);
        const c = await anon.get(`/posts/${enc(ctx.postId)}/categories`);
        expectStatus(c, 200);
        assert(containsId(pickList(c.json), ctx.catId), 'category is not linked to the post');
    });

    await test('GET /categories/:id/posts contains the post', async () => {
        need(ctx.postId, 'post id');
        const r = await anon.get(`/categories/${enc(ctx.catId)}/posts`);
        expectStatus(r, 200);
        assert(containsId(pickList(r.json), ctx.postId), 'post not found in category');
    });

    await test("another user cannot edit / delete someone else's post -> 403", async () => {
        need(ctx.postId, 'post id');
        expectStatus(await u2.patch(`/posts/${enc(ctx.postId)}`, { title: 'hacked' }), 403);
        expectStatus(await u2.del(`/posts/${enc(ctx.postId)}`), 403);
    });

    await test('author edits own post', async () => {
        need(ctx.postId, 'post id');
        expectStatus(await u1.patch(`/posts/${enc(ctx.postId)}`, { title: `Edited ${rnd}` }), 200);
        const r = await anon.get(`/posts/${enc(ctx.postId)}`);
        assert(JSON.stringify(r.json).includes(`Edited ${rnd}`), 'title was not updated');
    });

    await test('admin cannot edit post content (rejected or ignored)', async () => {
        need(ctx.postId, 'post id');
        await admin.patch(`/posts/${enc(ctx.postId)}`, { content: 'ADMIN-EDITED' });
        const r = await admin.get(`/posts/${enc(ctx.postId)}`);
        assert(
            !JSON.stringify(r.json).includes('ADMIN-EDITED'),
            'admin was able to change the content'
        );
    });

    await test('inactive post is hidden from other users / guests, visible to owner and admin', async () => {
        need(ctx.postId, 'post id');
        expectStatus(
            await admin.patch(`/posts/${enc(ctx.postId)}`, { status: 'inactive' }),
            200,
            'set inactive: '
        );
        const g = await anon.get(`/posts/${enc(ctx.postId)}`);
        assert([403, 404].includes(g.status), `guest got ${g.status}`);
        const o = await u2.get(`/posts/${enc(ctx.postId)}`);
        assert([403, 404].includes(o.status), `other user got ${o.status}`);
        expectStatus(await u1.get(`/posts/${enc(ctx.postId)}`), 200, 'owner: ');
        expectStatus(await admin.get(`/posts/${enc(ctx.postId)}`), 200, 'admin: ');
        const list = await anon.get(`/posts${qs({ [Q.limit]: 100 })}`);
        assert(!containsId(pickList(list.json), ctx.postId), 'inactive post is in the public list');
        const mine = await u1.get(`/posts${qs({ [Q.limit]: 100 })}`);
        assert(
            containsId(pickList(mine.json), ctx.postId),
            "owner doesn't see own inactive post in the list"
        );
    });

    await test('cannot comment on an inactive post', async () => {
        need(ctx.postId, 'post id');
        expectClientError(
            await u2.post(`/posts/${enc(ctx.postId)}/comments`, { content: 'should fail' })
        );
    });

    await test('admin sets the post active again', async () => {
        need(ctx.postId, 'post id');
        expectStatus(await admin.patch(`/posts/${enc(ctx.postId)}`, { status: 'active' }), 200);
        expectStatus(await anon.get(`/posts/${enc(ctx.postId)}`), 200);
    });

    section('Comments');

    await test('comment with empty content is rejected', async () => {
        need(ctx.postId, 'post id');
        expectStatus(
            await u2.post(`/posts/${enc(ctx.postId)}/comments`, { content: '' }),
            [400, 422]
        );
    });

    await test('guest cannot comment -> 401', async () => {
        need(ctx.postId, 'post id');
        expectStatus(
            await anon.post(`/posts/${enc(ctx.postId)}/comments`, { content: 'x' }),
            [401, 403]
        );
    });

    await test('user comments on an active post; list is public', async () => {
        need(ctx.postId, 'post id');
        const r = await u2.post(`/posts/${enc(ctx.postId)}/comments`, { content: 'Check comment' });
        expectStatus(r, [200, 201]);
        ctx.commentId =
            pickId(r.json, 'comment') ??
            (await findIdBy(
                anon,
                `/posts/${enc(ctx.postId)}/comments`,
                'content',
                'Check comment'
            ));
        assert(
            ctx.commentId !== undefined,
            `comment created (${r.status}) but no id in the response and not found in the comments list. Response: ${r.text.slice(0, 200)}`
        );
        const l = await anon.get(`/posts/${enc(ctx.postId)}/comments`);
        expectStatus(l, 200);
        assert(containsId(pickList(l.json), ctx.commentId), 'comment not in the list');
        expectStatus(await anon.get(`/comments/${enc(ctx.commentId)}`), 200);
    });

    await test('comment: status can be changed, content cannot', async () => {
        need(ctx.commentId, 'comment id');
        expectStatus(
            await u2.patch(`/comments/${enc(ctx.commentId)}`, { status: 'inactive' }),
            200,
            'status: '
        );
        await u2.patch(`/comments/${enc(ctx.commentId)}`, { content: 'EDITED-COMMENT' });
        const r = await admin.get(`/comments/${enc(ctx.commentId)}`);
        assert(!JSON.stringify(r.json).includes('EDITED-COMMENT'), 'comment content was edited');
        expectStatus(
            await u2.patch(`/comments/${enc(ctx.commentId)}`, { status: 'active' }),
            200,
            'restore: '
        );
    });

    await test('author profile lists own comments', async () => {
        need(ctx.u2Id, 'user2 id');
        need(ctx.commentId, 'comment id');
        const r = await u2.get(`/users/${enc(ctx.u2Id)}/comments`);
        expectStatus(r, 200);
        assert(
            containsId(pickList(r.json), ctx.commentId),
            'own comment is missing from profile comments'
        );
        expectStatus(await u1.get(`/users/${enc(ctx.u2Id)}/comments`), 403);
    });

    await test('guest cannot delete a comment -> 401', async () => {
        need(ctx.commentId, 'comment id');
        expectStatus(await anon.del(`/comments/${enc(ctx.commentId)}`), [401, 403]);
    });

    section('Likes and rating');

    await test('guest cannot like -> 401', async () => {
        need(ctx.postId, 'post id');
        expectStatus(
            await anon.post(`/posts/${enc(ctx.postId)}/like`, { type: 'like' }),
            [401, 403]
        );
    });

    await test(
        'invalid like type is rejected',
        async () => {
            need(ctx.postId, 'post id');
            expectStatus(
                await u2.post(`/posts/${enc(ctx.postId)}/like`, { type: 'banana' }),
                [400, 422]
            );
        },
        { soft: true }
    );

    await test('like on a post: only one like per user, rating of the author +1', async () => {
        need(ctx.postId, 'post id');
        need(ctx.u1Id, 'user1 id');
        ctx.ratingBefore = await ratingOf(ctx.u1Id);
        expectStatus(
            await u2.post(`/posts/${enc(ctx.postId)}/like`, { type: 'like' }),
            [200, 201],
            'like: '
        );
        await u2.post(`/posts/${enc(ctx.postId)}/like`, { type: 'like' });
        const likes = await likesOf(anon, 'posts', ctx.postId);
        assert(likes.length === 1, `expected exactly 1 like, found ${likes.length}`);
        const after = await ratingOf(ctx.u1Id);
        assert(
            after === ctx.ratingBefore + 1,
            `rating ${ctx.ratingBefore} -> ${after}, expected +1`
        );
    });

    await test(
        'switching like -> dislike keeps one record and gives rating -1 vs. start',
        async () => {
            need(ctx.postId, 'post id');
            need(ctx.ratingBefore, 'rating baseline');
            await u2.del(`/posts/${enc(ctx.postId)}/like`);
            expectStatus(
                await u2.post(`/posts/${enc(ctx.postId)}/like`, { type: 'dislike' }),
                [200, 201],
                'dislike: '
            );
            const likes = await likesOf(anon, 'posts', ctx.postId);
            assert(likes.length === 1, `expected 1 record, found ${likes.length}`);
            const after = await ratingOf(ctx.u1Id);
            assert(
                after === ctx.ratingBefore - 1,
                `rating ${ctx.ratingBefore} -> ${after}, expected -1`
            );
        },
        { soft: true }
    );

    await test("a user cannot delete someone else's like", async () => {
        need(ctx.postId, 'post id');
        await u1.del(`/posts/${enc(ctx.postId)}/like`);
        const likes = await likesOf(anon, 'posts', ctx.postId);
        assert(likes.length === 1, "user1 removed user2's like");
    });

    await test('author deletes own like; rating returns to the baseline', async () => {
        need(ctx.postId, 'post id');
        need(ctx.ratingBefore, 'rating baseline');
        expectStatus(await u2.del(`/posts/${enc(ctx.postId)}/like`), [200, 204]);
        assert((await likesOf(anon, 'posts', ctx.postId)).length === 0, 'like is still there');
        assert(
            (await ratingOf(ctx.u1Id)) === ctx.ratingBefore,
            'rating did not return to baseline'
        );
    });

    await test('likes on a comment: create, list, delete', async () => {
        need(ctx.commentId, 'comment id');
        expectStatus(
            await u1.post(`/comments/${enc(ctx.commentId)}/like`, { type: 'like' }),
            [200, 201],
            'like: '
        );
        assert(
            (await likesOf(anon, 'comments', ctx.commentId)).length === 1,
            'expected 1 like on comment'
        );
        expectStatus(await u1.del(`/comments/${enc(ctx.commentId)}/like`), [200, 204], 'delete: ');
        assert(
            (await likesOf(anon, 'comments', ctx.commentId)).length === 0,
            'like on comment is still there'
        );
    });

    section('Sorting and filtering (check param names in CFG.query)');

    await test('sort by likes (default) and by date return 200', async () => {
        expectStatus(await anon.get(`/posts${qs({ [Q.sort]: Q.sortLikes })}`), 200);
        expectStatus(await anon.get(`/posts${qs({ [Q.sort]: Q.sortDate })}`), 200);
    });

    await test(
        'sort by likes is really descending',
        async () => {
            const r = await anon.get(`/posts${qs({ [Q.sort]: Q.sortLikes, [Q.limit]: 100 })}`);
            const list = pickList(r.json) || [];
            const field = ['likes', 'likesCount', 'likes_count', 'rating', 'score'].find(
                (f) => list[0] && typeof list[0][f] === 'number'
            );
            assert(field, 'posts have no numeric likes field - verify the order manually');
            for (let i = 1; i < list.length; i++) {
                assert(list[i - 1][field] >= list[i][field], `order broken at index ${i}`);
            }
        },
        { soft: true }
    );

    await test('filter by category', async () => {
        need(ctx.postId, 'post id');
        const r = await anon.get(`/posts${qs({ [Q.categories]: ctx.catId })}`);
        expectStatus(r, 200);
        assert(containsId(pickList(r.json), ctx.postId), 'post not found by its category');
    });

    await test('filter by date interval (inside / outside)', async () => {
        need(ctx.postId, 'post id');
        const now = Date.now();
        const inside = await anon.get(
            `/posts${qs({ [Q.dateFrom]: iso(new Date(now - 864e5)), [Q.dateTo]: iso(new Date(now + 864e5)) })}`
        );
        expectStatus(inside, 200);
        assert(containsId(pickList(inside.json), ctx.postId), 'post missing inside the interval');
        const outside = await anon.get(
            `/posts${qs({ [Q.dateFrom]: '2000-01-01', [Q.dateTo]: '2000-01-02' })}`
        );
        expectStatus(outside, 200);
        assert(
            !containsId(pickList(outside.json), ctx.postId),
            'post present outside the interval'
        );
    });

    await test('filter by status', async () => {
        expectStatus(await anon.get(`/posts${qs({ [Q.status]: 'active' })}`), 200);
        const r = await admin.get(`/posts${qs({ [Q.status]: 'inactive' })}`);
        expectStatus(r, 200);
    });

    section('Delete operations and cleanup');

    await test('author deletes own comment', async () => {
        need(ctx.commentId, 'comment id');
        expectStatus(await u2.del(`/comments/${enc(ctx.commentId)}`), [200, 204]);
        expectStatus(await anon.get(`/comments/${enc(ctx.commentId)}`), 404);
    });

    await test('admin deletes the post (cascade: it disappears)', async () => {
        need(ctx.postId, 'post id');
        expectStatus(await admin.del(`/posts/${enc(ctx.postId)}`), [200, 204]);
        expectStatus(await anon.get(`/posts/${enc(ctx.postId)}`), 404);
    });

    await test('admin deletes the category', async () => {
        need(ctx.catId, 'category id');
        expectStatus(await admin.del(`/categories/${enc(ctx.catId)}`), [200, 204]);
    });

    await test(
        'admin deletes the users created by this script',
        async () => {
            const ids = [ctx.adminCreatedId];
            if (ctx.regLogin) ids.push(await userIdByLogin(ctx.regLogin));
            for (const id of ids.filter(Boolean))
                expectStatus(await admin.del(`/users/${enc(id)}`), [200, 204]);
        },
        { soft: true }
    );

    await test('logout: session is closed', async () => {
        expectStatus(await u1.post('/auth/logout', {}), [200, 204]);
        const r = await u1.post('/posts', { title: 't', content: 'c', categories: [] });
        assert(
            [401, 403].includes(r.status),
            `after logout POST /posts returned ${r.status} (token still valid?)`
        );
    });
}

function report() {
    const skipped = results.filter((r) => r.skipped);
    const failed = results.filter((r) => !r.ok && !r.soft && !r.skipped);
    const warned = results.filter((r) => !r.ok && r.soft && !r.skipped);
    const passed = results.filter((r) => r.ok);

    console.log('\n==================== SUMMARY ====================');
    console.log(
        `requests: ${stats.requests} | passed: ${passed.length} | warnings: ${warned.length} | failed: ${failed.length} | skipped: ${skipped.length}`
    );

    if (failed.length) {
        console.log('\nFAILED:');
        failed.forEach((r) => console.log(`  \u2718 [${r.section}] ${r.name}\n      ${r.msg}`));
    }
    if (skipped.length) {
        console.log(
            `\nSKIPPED: ${skipped.length} tests did not run because they depend on something that failed above.`
        );
        console.log('Fix the FAILED items first and run again; these are not separate bugs.');
        skipped.forEach((r) => console.log(`  \u21B7 [${r.section}] ${r.name}`));
    }
    if (warned.length) {
        console.log('\nWARNINGS (soft checks - may depend on your design choices):');
        warned.forEach((r) => console.log(`  \u26A0 [${r.section}] ${r.name}\n      ${r.msg}`));
    }
    if (stats.serverErrors.length) {
        console.log('\n5xx RESPONSES (a server must not crash on bad input):');
        [...new Set(stats.serverErrors)].forEach((s) => console.log(`  - ${s}`));
    }
    if (stats.uninformative.size) {
        console.log(
            '\n4xx WITHOUT A JSON "message"/"error" (error handling should be informative):'
        );
        [...stats.uninformative].slice(0, 15).forEach((s) => console.log(`  - ${s}`));
    }

    console.log(`
NOT CHECKABLE BY A SCRIPT - verify by hand / in code review:
  [ ] MVC structure, OOP and SOLID in the code; style guides / linter
  [ ] DB is created and re-created automatically on start; >= 5 rows in every table
  [ ] Passwords are hashed (bcrypt/argon2) in the DB, never stored in plain text
  [ ] E-mail confirmation link and password-reset e-mail really arrive and work
  [ ] Uploaded files are stored on the local file system
  [ ] Admin panel exists, works and is reachable only for admins
  [ ] Post/comment locking (inactive) works from the admin panel
  [ ] README: description, screenshots, requirements, run steps; docs per CBL stage
  [ ] Act: Creative features (favorites, subscriptions/notifications, ...)
  [ ] LinkedIn post with #InnovationCampusKhPI
`);

    process.exitCode = failed.length || skipped.length ? 1 : 0;
}

main()
    .catch((e) => {
        console.error('Fatal error in the checker itself:', e);
        process.exitCode = 2;
    })
    .finally(report);
