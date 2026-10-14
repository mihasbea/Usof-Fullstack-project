function visibilityCondition(alias, user) {
    if (user?.role === 'admin') {
        return null;
    }
    if (user) {
        return { sql: `(${alias}.status = 'active' OR ${alias}.author_id = ?)`, params: [user.id] };
    }
    return { sql: `${alias}.status = 'active'`, params: [] };
}

function isVisibleTo(row, user) {
    return row.status === 'active' || user?.role === 'admin' || row.author_id === user?.id;
}

module.exports = { visibilityCondition, isVisibleTo };
