const PROPERTY_KEYS = new Set(['value', 'checked']);

export function el(tag, props = {}, ...children) {
    const element = document.createElement(tag);
    element.append(
        ...children
            .flat()
            .filter((child) => child !== null && child !== undefined && child !== false)
    );

    for (const [key, value] of Object.entries(props)) {
        if (value === null || value === undefined || value === false) {
            continue;
        }
        if (key.startsWith('on')) {
            element.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.assign(element.dataset, value);
        } else if (PROPERTY_KEYS.has(key)) {
            element[key] = value;
        } else {
            element.setAttribute(key, value === true ? '' : String(value));
        }
    }
    return element;
}

export function formatDate(value) {
    return new Date(value).toLocaleString();
}

export function truncate(text, maxLength) {
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
