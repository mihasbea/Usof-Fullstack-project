const { parsePositiveInt } = require('../utils/validators');

function parseIdParam(paramName, entityName) {
    return (req, res, next) => {
        const id = parsePositiveInt(req.params[paramName]);
        if (!id) {
            return res.status(400).json({ message: `Invalid ${entityName} ID format` });
        }

        req.ids = { ...req.ids, [paramName]: id };
        return next();
    };
}

module.exports = parseIdParam;
