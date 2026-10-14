const { parsePositiveInt } = require('./validators');

const MAX_PAGE_SIZE = 100;

function parsePagination(query, defaultLimit) {
    const page = query.page === undefined ? 1 : parsePositiveInt(query.page);
    const limit = query.limit === undefined ? defaultLimit : parsePositiveInt(query.limit);

    if (!page || !limit || limit > MAX_PAGE_SIZE) {
        return {
            error: `Page must be a positive integer and limit must be between 1 and ${MAX_PAGE_SIZE}`,
        };
    }
    return { page, limit, offset: (page - 1) * limit };
}

function buildPagination(totalKey, total, page, limit) {
    return {
        [totalKey]: total,
        total_pages: Math.ceil(total / limit),
        current_page: page,
        limit,
    };
}

module.exports = { parsePagination, buildPagination };
