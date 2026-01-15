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
    if (prop.type === 'object' && prop.properties) {
        return toPascalCase(key);
    }
    if (prop.type === 'array' && prop.itemType) {
        if (prop.itemType.type === 'object' && prop.itemType.properties) {
            return `${toPascalCase(key)}Item[]`;
        }
        return typeToTypeScript(prop.itemType);
    }
    return typeToTypeScript(prop);
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
        if (prop.type === 'object' && prop.properties) {
            const nestedName = toPascalCase(key);
            // Recursively generate nested interfaces first
            interfaces.push(...generateNestedInterfaces(prop.properties, nestedName));
            interfaces.push(generateInterface(prop.properties, nestedName));
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = toPascalCase(key) + 'Item';
                interfaces.push(...generateNestedInterfaces(prop.itemType.properties, nestedName));
                interfaces.push(generateInterface(prop.itemType.properties, nestedName));
            }
        }
    }

    return interfaces;
}

function generateMultipleFiles(parsedData, typeName) {
    const interfaceName = toPascalCase(typeName);
    const files = [];

    // Collect all nested interfaces as separate files
    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'object' && prop.properties) {
                const nestedName = toPascalCase(key);
                collectFiles(prop.properties);
                files.push({
                    filename: `${nestedName}.ts`,
                    content: generateInterface(prop.properties, nestedName),
                    language: 'typescript'
                });
            } else if (prop.type === 'array' && prop.itemType) {
                if (prop.itemType.type === 'object' && prop.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    collectFiles(prop.itemType.properties);
                    files.push({
                        filename: `${nestedName}.ts`,
                        content: generateInterface(prop.itemType.properties, nestedName),
                        language: 'typescript'
                    });
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    // Add main interface
    let mainContent = generateInterface(parsedData.properties, interfaceName);
    if (parsedData.isArray) {
        mainContent += `\n\ntype ${interfaceName}Array = ${interfaceName}[];`;
    }
    files.push({
        filename: `${interfaceName}.ts`,
        content: mainContent,
        language: 'typescript'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName);
    }

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
