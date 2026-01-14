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
    if (prop.type && typeof prop.type === 'object') {
        if (prop.type.type === 'object' && prop.type.properties) {
            return toPascalCase(key);
        }
        if (prop.type.type === 'array' && prop.type.itemType) {
            if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                return `std::vector<${toPascalCase(key)}Item>`;
            }
            return typeToCpp(prop.type);
        }
    }
    return typeToCpp(prop.type);
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
        if (prop.type && typeof prop.type === 'object') {
            if (prop.type.type === 'object' && prop.type.properties) {
                const nestedName = toPascalCase(key);
                // Recursively generate nested classes first
                nestedCode += generateNestedClasses(prop.type.properties);
                nestedCode += generateClass(prop.type.properties, nestedName);
                nestedCode += '\n\n';
            } else if (prop.type.type === 'array' && prop.type.itemType) {
                if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    nestedCode += generateNestedClasses(prop.type.itemType.properties);
                    nestedCode += generateClass(prop.type.itemType.properties, nestedName);
                    nestedCode += '\n\n';
                }
            }
        }
    }

    return nestedCode;
}

function generate(parsedData, typeName) {
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
