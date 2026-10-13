const { buildPagination, parsePagination } = require('./pagination');
const { parseDate, parseIdList } = require('./validators');

const DEFAULT_PAGE_SIZE = 10;
const POST_STATUSES = ['active', 'inactive'];
const SORT_OPTIONS = ['likes', 'date'];
const ORDER_OPTIONS = ['asc', 'desc'];

function parsePostListQuery(query) {
    const pagination = parsePagination(query, DEFAULT_PAGE_SIZE);
    if (pagination.error) {
        return pagination;
    }

    const { sort = 'likes', order = 'desc', status } = query;
    if (!SORT_OPTIONS.includes(sort)) {
        return { error: `Sort must be one of: ${SORT_OPTIONS.join(', ')}` };
    }
    if (!ORDER_OPTIONS.includes(order)) {
        return { error: `Order must be one of: ${ORDER_OPTIONS.join(', ')}` };
    }
    if (status !== undefined && !POST_STATUSES.includes(status)) {
        return { error: `Status must be one of: ${POST_STATUSES.join(', ')}` };
    }

    let categoryIds;
    if (query.categories !== undefined) {
        categoryIds = parseIdList(query.categories);
        if (!categoryIds) {
            return { error: 'Categories must be a comma-separated list of category IDs' };
        }
    }

    const rawDateFrom = query.date_from ?? query.dateFrom;
    const rawDateTo = query.date_to ?? query.dateTo;
    const dateFrom = rawDateFrom === undefined ? undefined : parseDate(rawDateFrom);
    const dateTo = rawDateTo === undefined ? undefined : parseDate(rawDateTo);
    if (dateFrom === null || dateTo === null) {
        return { error: 'Dates must be valid dates in the YYYY-MM-DD format' };
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
        return { error: 'date_from must not be later than date_to' };
    }
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    if (search.length > 255) {
        return { error: 'Search must be at most 255 characters long' };
    }

    return {
        ...pagination,
        sort,
        order,
        filters: { status, categoryIds, dateFrom, dateTo, search },
    };
}

function buildPostListResponse(posts, total, page, limit) {
    return {
        data: posts,
        pagination: buildPagination('total_posts', total, page, limit),
    };
}

module.exports = { POST_STATUSES, parsePostListQuery, buildPostListResponse };
