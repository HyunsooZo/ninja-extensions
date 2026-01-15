const { toPascalCase, toSnakeCase, collectNestedTypes } = require('../utils');

function typeToCpp(typeInfo) {
    if (typeof typeInfo === 'string') {
        switch (typeInfo) {
            case 'string': return 'std::string';
            case 'integer': return 'int';
            case 'number': return 'double';
            case 'boolean': return 'bool';
            case 'null': return 'std::nullptr_t';
            default: return 'std::any';
        }
    }

    if (typeInfo.type === 'array') {
        const itemType = typeToCpp(typeInfo.itemType);
        return `std::vector<${itemType}>`;
    }

    // C++ doesn't have native union types for mixed values, use std::any
    if (typeInfo.type === 'union') {
        return 'std::any';
    }

    if (typeInfo.type === 'object') {
        return 'std::any';
    }

    switch (typeInfo.type) {
        case 'string': return 'std::string';
        case 'integer': return 'int';
        case 'number': return 'double';
        case 'boolean': return 'bool';
        case 'null': return 'std::nullptr_t';
        default: return 'std::any';
    }
}

function getTypeForProperty(key, prop) {
    if (prop.type === 'object' && prop.properties) {
        return toPascalCase(key);
    }
    if (prop.type === 'array' && prop.itemType) {
        if (prop.itemType.type === 'object' && prop.itemType.properties) {
            return `std::vector<${toPascalCase(key)}Item>`;
        }
        const itemType = typeToCpp(prop.itemType);
        return `std::vector<${itemType}>`;
    }
    return typeToCpp(prop);
}

function generateClass(properties, name) {
    let code = `class ${name} {\n`;
    code += `public:\n`;

    const entries = Object.entries(properties);

    // Member variables
    for (const [key, prop] of entries) {
        const cppType = getTypeForProperty(key, prop);
        const fieldName = toSnakeCase(key);
        code += `    ${cppType} ${fieldName};\n`;
    }

    if (entries.length === 0) {
        code += `    // Empty class\n`;
    }

    // Constructor
    code += `\n    ${name}() = default;\n`;

    code += `};`;

    return code;
}

function generateNestedClasses(properties) {
    let nestedCode = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type === 'object' && prop.properties) {
            const nestedName = toPascalCase(key);
            // Recursively generate nested classes first
            nestedCode += generateNestedClasses(prop.properties);
            nestedCode += generateClass(prop.properties, nestedName);
            nestedCode += '\n\n';
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = toPascalCase(key) + 'Item';
                nestedCode += generateNestedClasses(prop.itemType.properties);
                nestedCode += generateClass(prop.itemType.properties, nestedName);
                nestedCode += '\n\n';
            }
        }
    }

    return nestedCode;
}

function generateMultipleFiles(parsedData, typeName) {
    const className = toPascalCase(typeName);
    const files = [];
    const includes = `#include <string>\n#include <vector>\n#include <any>\n\n`;

    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'object' && prop.properties) {
                const nestedName = toPascalCase(key);
                collectFiles(prop.properties);
                files.push({
                    filename: `${nestedName}.hpp`,
                    content: includes + generateClass(prop.properties, nestedName),
                    language: 'cpp'
                });
            } else if (prop.type === 'array' && prop.itemType) {
                if (prop.itemType.type === 'object' && prop.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    collectFiles(prop.itemType.properties);
                    files.push({
                        filename: `${nestedName}.hpp`,
                        content: includes + generateClass(prop.itemType.properties, nestedName),
                        language: 'cpp'
                    });
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    files.push({
        filename: `${className}.hpp`,
        content: includes + generateClass(parsedData.properties, className),
        language: 'cpp'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName);
    }

    const className = toPascalCase(typeName);

    let code = `#include <string>\n#include <vector>\n#include <any>\n\n`;

    // Generate nested classes first
    const nestedClasses = generateNestedClasses(parsedData.properties);
    if (nestedClasses) {
        code += nestedClasses;
    }

    // Generate main class
    code += generateClass(parsedData.properties, className);

    return code;
}

module.exports = { generate };
