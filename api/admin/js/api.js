const TOKEN_KEY = 'usof-admin-token';

export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.token = sessionStorage.getItem(TOKEN_KEY);
        this.onUnauthorized = () => {};
    }

    setToken(token) {
        this.token = token;
        if (token) {
            sessionStorage.setItem(TOKEN_KEY, token);
        } else {
            sessionStorage.removeItem(TOKEN_KEY);
        }
    }

    getTokenUserId() {
        const payload = this.token?.split('.')[1];
        if (!payload) {
            return null;
        }
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json).id;
    }

    async request(method, path, { body, query } = {}) {
        const url = new URL(`${this.baseUrl}${path}`, window.location.origin);
        for (const [key, value] of Object.entries(query ?? {})) {
            if (value !== undefined && value !== '') {
                url.searchParams.set(key, value);
            }
        }

        const headers = {};
        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }
        const isFormData = body instanceof FormData;
        if (body !== undefined && !isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
            cache: method === 'GET' ? 'no-store' : 'default',
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            if (response.status === 401 && this.token) {
                this.onUnauthorized();
            }
            throw new ApiError(
                response.status,
                data?.message ?? `Request failed with status ${response.status}`
            );
        }
        if (method !== 'GET' && method !== 'HEAD') {
            window.dispatchEvent(new Event('usof:data-changed'));
        }
        return data;
    }

    get(path, query) {
        return this.request('GET', path, { query });
    }

    post(path, body) {
        return this.request('POST', path, { body });
    }

    patch(path, body) {
        return this.request('PATCH', path, { body });
    }

    delete(path) {
        return this.request('DELETE', path);
    }
}
