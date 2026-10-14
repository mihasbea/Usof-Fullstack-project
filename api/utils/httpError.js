function createHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    error.expose = true;
    return error;
}

module.exports = { createHttpError };
