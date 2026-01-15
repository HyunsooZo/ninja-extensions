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

    // C doesn't have union types for mixed values, use void*
    if (typeInfo.type === 'union') {
        return 'void*';
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
    if (prop.type === 'object' && prop.properties) {
        return `${toSnakeCase(key)}_t`;
    }
    if (prop.type === 'array' && prop.itemType) {
        if (prop.itemType.type === 'object' && prop.itemType.properties) {
            return `${toSnakeCase(key)}_item_t*`;
        }
        const itemType = typeToC(prop.itemType);
        return `${itemType}*`;
    }
    return typeToC(prop);
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
        if (prop.type === 'object' && prop.properties) {
            const nestedName = key;
            // Recursively generate nested structs first
            nestedCode += generateNestedStructs(prop.properties);
            nestedCode += generateStruct(prop.properties, nestedName);
            nestedCode += '\n\n';
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = key + '_item';
                nestedCode += generateNestedStructs(prop.itemType.properties);
                nestedCode += generateStruct(prop.itemType.properties, nestedName);
                nestedCode += '\n\n';
            }
        }
    }

    return nestedCode;
}

function generateMultipleFiles(parsedData, typeName) {
    const structName = toPascalCase(typeName);
    const files = [];
    const includes = `#include <stddef.h>\n\n`;

    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'object' && prop.properties) {
                const nestedName = key;
                collectFiles(prop.properties);
                files.push({
                    filename: `${toSnakeCase(nestedName)}.h`,
                    content: includes + generateStruct(prop.properties, nestedName),
                    language: 'c'
                });
            } else if (prop.type === 'array' && prop.itemType) {
                if (prop.itemType.type === 'object' && prop.itemType.properties) {
                    const nestedName = key + '_item';
                    collectFiles(prop.itemType.properties);
                    files.push({
                        filename: `${toSnakeCase(nestedName)}.h`,
                        content: includes + generateStruct(prop.itemType.properties, nestedName),
                        language: 'c'
                    });
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    files.push({
        filename: `${toSnakeCase(structName)}.h`,
        content: includes + generateStruct(parsedData.properties, structName),
        language: 'c'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName);
    }

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
