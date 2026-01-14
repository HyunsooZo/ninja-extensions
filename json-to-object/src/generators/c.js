const { toPascalCase, toSnakeCase, collectNestedTypes } = require('../utils');

function typeToC(typeInfo) {
    if (typeof typeInfo === 'string') {
        switch (typeInfo) {
            case 'string': return 'char*';
            case 'integer': return 'int';
            case 'number': return 'double';
            case 'boolean': return 'int';
            case 'null': return 'void*';
            default: return 'void*';
        }
    }

    if (typeInfo.type === 'array') {
        const itemType = typeToC(typeInfo.itemType);
        return `${itemType}*`;
    }

    if (typeInfo.type === 'object') {
        return 'void*';
    }

    switch (typeInfo.type) {
        case 'string': return 'char*';
        case 'integer': return 'int';
        case 'number': return 'double';
        case 'boolean': return 'int';
        case 'null': return 'void*';
        default: return 'void*';
    }
}

function getTypeForProperty(key, prop) {
    if (prop.type && typeof prop.type === 'object') {
        if (prop.type.type === 'object' && prop.type.properties) {
            return `${toSnakeCase(key)}_t`;
        }
        if (prop.type.type === 'array' && prop.type.itemType) {
            if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                return `${toSnakeCase(key)}_item_t*`;
            }
            return typeToC(prop.type);
        }
    }
    return typeToC(prop.type);
}

function generateStruct(properties, name) {
    const structName = toSnakeCase(name);
    let code = `typedef struct {\n`;

    const entries = Object.entries(properties);
    if (entries.length === 0) {
        code += `    int dummy; // Empty struct placeholder\n`;
    } else {
        for (const [key, prop] of entries) {
            const cType = getTypeForProperty(key, prop);
            const fieldName = toSnakeCase(key);
            code += `    ${cType} ${fieldName};\n`;
        }
    }

    code += `} ${structName}_t;`;

    return code;
}

function generateNestedStructs(properties) {
    let nestedCode = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type && typeof prop.type === 'object') {
            if (prop.type.type === 'object' && prop.type.properties) {
                const nestedName = key;
                // Recursively generate nested structs first
                nestedCode += generateNestedStructs(prop.type.properties);
                nestedCode += generateStruct(prop.type.properties, nestedName);
                nestedCode += '\n\n';
            } else if (prop.type.type === 'array' && prop.type.itemType) {
                if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                    const nestedName = key + '_item';
                    nestedCode += generateNestedStructs(prop.type.itemType.properties);
                    nestedCode += generateStruct(prop.type.itemType.properties, nestedName);
                    nestedCode += '\n\n';
                }
            }
        }
    }

    return nestedCode;
}

function generate(parsedData, typeName) {
    const structName = toPascalCase(typeName);

    let code = `#include <stddef.h>\n\n`;

    // Generate nested structs first
    const nestedStructs = generateNestedStructs(parsedData.properties);
    if (nestedStructs) {
        code += nestedStructs;
    }

    // Generate main struct
    code += generateStruct(parsedData.properties, structName);

    return code;
}

module.exports = { generate };
