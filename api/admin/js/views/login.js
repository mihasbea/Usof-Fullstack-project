import { el } from '../dom.js';
import { field, formError, submitForm } from '../ui.js';

export function renderLogin(root, { api, onLogin }) {
    const identifier = el('input', {
        name: 'identifier',
        required: true,
        autocomplete: 'username',
    });
    const password = el('input', {
        name: 'password',
        type: 'password',
        required: true,
        autocomplete: 'current-password',
    });
    const error = formError();

    const form = el(
        'form',
        {
            className: 'login-card',
            onsubmit: (event) =>
                submitForm(event, error, async () => {
                    const value = identifier.value.trim();
                    const credentials = value.includes('@') ? { email: value } : { login: value };
                    const { token } = await api.post('/auth/login', {
                        ...credentials,
                        password: password.value,
                    });
                    await onLogin(token);
                }),
        },
        el('h1', {}, 'Usof admin'),
        el('p', { className: 'muted' }, 'Only accounts with the admin role can sign in.'),
        field('Login or email', identifier),
        field('Password', password),
        error,
        el('button', { className: 'button button-primary', type: 'submit' }, 'Log in')
    );

    root.replaceChildren(el('main', { className: 'login-page' }, form));
    identifier.focus();
}
