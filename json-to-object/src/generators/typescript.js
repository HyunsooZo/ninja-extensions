const { toPascalCase } = require('../utils');

function typeToTypeScript(typeInfo) {
    if (typeof typeInfo === 'string') {
        switch (typeInfo) {
            case 'string': return 'string';
            case 'integer': return 'number';
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'null': return 'null';
            default: return 'any';
        }
    }

    if (typeInfo.type === 'array') {
        const itemType = typeToTypeScript(typeInfo.itemType);
        return `${itemType}[]`;
    }

    if (typeInfo.type === 'object') {
        return 'object';
    }

    switch (typeInfo.type) {
        case 'string': return 'string';
        case 'integer': return 'number';
        case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'null': return 'null';
        default: return 'any';
    }
}

function getTypeForProperty(key, prop) {
    if (prop.type && typeof prop.type === 'object') {
        if (prop.type.type === 'object' && prop.type.properties) {
            return toPascalCase(key);
        }
        if (prop.type.type === 'array' && prop.type.itemType) {
            if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                return `${toPascalCase(key)}Item[]`;
            }
            return typeToTypeScript(prop.type);
        }
    }
    return typeToTypeScript(prop.type);
}

function generateInterface(properties, name, indent = '') {
    let code = `${indent}interface ${name} {\n`;

    for (const [key, prop] of Object.entries(properties)) {
        const optional = prop.optional ? '?' : '';
        const tsType = getTypeForProperty(key, prop);
        code += `${indent}  ${key}${optional}: ${tsType};\n`;
    }

    code += `${indent}}`;
    return code;
}

function generateNestedInterfaces(properties, baseName) {
    let interfaces = [];

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type && typeof prop.type === 'object') {
            if (prop.type.type === 'object' && prop.type.properties) {
                const nestedName = toPascalCase(key);
                // Recursively generate nested interfaces first
                interfaces.push(...generateNestedInterfaces(prop.type.properties, nestedName));
                interfaces.push(generateInterface(prop.type.properties, nestedName));
            } else if (prop.type.type === 'array' && prop.type.itemType) {
                if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    interfaces.push(...generateNestedInterfaces(prop.type.itemType.properties, nestedName));
                    interfaces.push(generateInterface(prop.type.itemType.properties, nestedName));
                }
            }
        }
    }

    return interfaces;
}

function generate(parsedData, typeName) {
    const interfaceName = toPascalCase(typeName);

    let code = '';

    // Generate nested interfaces first
    const nestedInterfaces = generateNestedInterfaces(parsedData.properties, interfaceName);
    if (nestedInterfaces.length > 0) {
        code += nestedInterfaces.join('\n\n') + '\n\n';
    }

    // Generate main interface
    code += generateInterface(parsedData.properties, interfaceName);

    if (parsedData.isArray) {
        code += `\n\ntype ${interfaceName}Array = ${interfaceName}[];`;
    }

    return code;
}

module.exports = { generate };
