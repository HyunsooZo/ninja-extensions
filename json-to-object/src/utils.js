/**
 * Convert string to PascalCase
 * @param {string} str - Input string
 * @returns {string} PascalCase string
 */
function toPascalCase(str) {
    return str
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        .replace(/^(.)/, (c) => c.toUpperCase());
}

/**
 * Convert string to camelCase
 * @param {string} str - Input string
 * @returns {string} camelCase string
 */
function toCamelCase(str) {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert string to snake_case
 * @param {string} str - Input string
 * @returns {string} snake_case string
 */
function toSnakeCase(str) {
    return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/[-\s]+/g, '_');
}

/**
 * Collect all nested object types from parsed data
 * @param {Object} properties - Parsed properties
 * @param {string} baseName - Base name for nested types
 * @returns {Array} Array of { name, properties } for nested types
 */
function collectNestedTypes(properties, baseName) {
    const nestedTypes = [];

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type && typeof prop.type === 'object') {
            if (prop.type.type === 'object' && prop.type.properties) {
                const nestedName = toPascalCase(key);
                nestedTypes.push({
                    name: nestedName,
                    properties: prop.type.properties
                });
                // Recursively collect deeper nested types
                nestedTypes.push(...collectNestedTypes(prop.type.properties, nestedName));
            } else if (prop.type.type === 'array' && prop.type.itemType) {
                // Handle array of objects
                if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    nestedTypes.push({
                        name: nestedName,
                        properties: prop.type.itemType.properties
                    });
                    nestedTypes.push(...collectNestedTypes(prop.type.itemType.properties, nestedName));
                }
            }
        }
    }

    return nestedTypes;
}

module.exports = {
    toPascalCase,
    toCamelCase,
    toSnakeCase,
    collectNestedTypes
};
