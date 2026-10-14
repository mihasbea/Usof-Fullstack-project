import { el } from './dom.js';

const TOAST_DURATION_MS = 4000;

export function showToast(message, type = 'success') {
    const toast = el('div', { className: `toast toast-${type}`, role: 'status' }, message);
    document.getElementById('toasts').append(toast);
    setTimeout(() => toast.remove(), TOAST_DURATION_MS);
}

export async function runAction(action, successMessage) {
    try {
        const result = await action();
        if (successMessage) {
            showToast(
                typeof successMessage === 'function' ? successMessage(result) : successMessage
            );
        }
        return { ok: true, result };
    } catch (error) {
        showToast(error.message, 'error');
        return { ok: false };
    }
}

export function openModal(title, content) {
    const dialog = el(
        'dialog',
        { className: 'modal', 'aria-label': title },
        el(
            'header',
            { className: 'modal-header' },
            el('h2', {}, title),
            el(
                'button',
                {
                    className: 'button button-ghost',
                    type: 'button',
                    'aria-label': 'Close',
                    onclick: () => dialog.close(),
                },
                '✕'
            )
        ),
        el('div', { className: 'modal-body' }, content)
    );

    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
    return dialog;
}

export function field(label, input) {
    return el(
        'label',
        { className: 'field' },
        el('span', { className: 'field-label' }, label),
        input
    );
}

export function select(name, options, value) {
    return el(
        'select',
        { name, value },
        options.map(([optionValue, text]) => el('option', { value: optionValue }, text))
    );
}

export function button(text, onclick, variant = 'primary') {
    return el('button', { className: `button button-${variant}`, type: 'button', onclick }, text);
}

export function likeCounts(item) {
    return el(
        'span',
        { className: 'vote-summary' },
        el(
            'span',
            { className: 'vote-value' },
            el('img', { src: '/assets/icons/like.png', alt: 'Like', className: 'vote-icon' }),
            String(item.likes_count || 0)
        ),
        el(
            'span',
            { className: 'vote-value' },
            el('img', { src: '/assets/icons/dislike.png', alt: 'Dislike', className: 'vote-icon' }),
            String(item.dislikes_count || 0)
        )
    );
}

export function statusBadge(status) {
    return el('span', { className: `badge badge-${status}` }, status);
}

export function renderPagination(pagination, onChange) {
    const { current_page: page, total_pages: totalPages } = pagination;
    return el(
        'nav',
        { className: 'pagination', 'aria-label': 'Pagination' },
        el(
            'button',
            {
                className: 'button button-secondary',
                type: 'button',
                disabled: page <= 1,
                onclick: () => onChange(page - 1),
            },
            'Previous'
        ),
        el('span', {}, `Page ${page} of ${Math.max(totalPages, 1)}`),
        el(
            'button',
            {
                className: 'button button-secondary',
                type: 'button',
                disabled: page >= totalPages,
                onclick: () => onChange(page + 1),
            },
            'Next'
        )
    );
}

export function table(headers, rows, emptyText, className = '') {
    if (rows.length === 0) {
        return el('p', { className: `empty ${className}`.trim() }, emptyText);
    }
    return el(
        'div',
        { className: `table-wrapper ${className}`.trim() },
        el(
            'table',
            {},
            el(
                'thead',
                {},
                el(
                    'tr',
                    {},
                    headers.map((header) => el('th', {}, header))
                )
            ),
            el(
                'tbody',
                {},
                rows.map((cells) =>
                    el(
                        'tr',
                        {},
                        cells.map((cell) => el('td', {}, cell))
                    )
                )
            )
        )
    );
}

export function formError() {
    return el('p', { className: 'form-error', role: 'alert' });
}

export async function submitForm(event, errorElement, action) {
    event.preventDefault();
    const submitButton = event.target.querySelector('[type="submit"]');
    errorElement.textContent = '';
    submitButton.disabled = true;

    try {
        await action();
    } catch (error) {
        errorElement.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
}
