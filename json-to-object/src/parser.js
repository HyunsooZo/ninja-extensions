function parseJson(jsonString) {
    const parsed = JSON.parse(jsonString);
    return analyzeType(parsed);
}

function analyzeType(value) {
    if (value === null) {
        return { type: 'null', value: null };
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return { type: 'array', itemType: { type: 'any' } };
        }
        const itemType = analyzeType(value[0]);
        return { type: 'array', itemType };
    }

    if (typeof value === 'object') {
        const properties = {};
        for (const [key, val] of Object.entries(value)) {
            properties[key] = analyzeType(val);
        }
        return { type: 'object', properties };
    }

    if (typeof value === 'string') {
        return { type: 'string', value };
    }

    if (typeof value === 'number') {
        return { type: Number.isInteger(value) ? 'integer' : 'number', value };
    }

    if (typeof value === 'boolean') {
        return { type: 'boolean', value };
    }

    return { type: 'any' };
}

module.exports = { parseJson, analyzeType };
