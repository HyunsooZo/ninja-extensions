const { toPascalCase, toCamelCase, collectNestedTypes } = require('../utils');

function typeToKotlin(typeInfo) {
    if (typeof typeInfo === 'string') {
        switch (typeInfo) {
            case 'string': return 'String';
            case 'integer': return 'Int';
            case 'number': return 'Double';
            case 'boolean': return 'Boolean';
            case 'null': return 'Any?';
            default: return 'Any';
        }
    }

    if (typeInfo.type === 'array') {
        const itemType = typeToKotlin(typeInfo.itemType);
        return `List<${itemType}>`;
    }

    if (typeInfo.type === 'object') {
        return 'Any';
    }

    switch (typeInfo.type) {
        case 'string': return 'String';
        case 'integer': return 'Int';
        case 'number': return 'Double';
        case 'boolean': return 'Boolean';
        case 'null': return 'Any?';
        default: return 'Any';
    }
}

function getTypeForProperty(key, prop) {
    if (prop.type === 'object' && prop.properties) {
        return toPascalCase(key);
    }
    if (prop.type === 'array' && prop.itemType) {
        if (prop.itemType.type === 'object' && prop.itemType.properties) {
            return `List<${toPascalCase(key)}Item>`;
        }
        return typeToKotlin(prop.itemType);
    }
    return typeToKotlin(prop);
}

function generateDataClass(properties, name) {
    let code = `data class ${name}(\n`;

    const entries = Object.entries(properties);

    if (entries.length === 0) {
        code += `)`;
        return code;
    }

    for (let i = 0; i < entries.length; i++) {
        const [key, prop] = entries[i];
        const kotlinType = getTypeForProperty(key, prop);
        const fieldName = toCamelCase(key);
        const comma = i < entries.length - 1 ? ',' : '';

        code += `    val ${fieldName}: ${kotlinType}${comma}\n`;
    }

    code += `)`;

    return code;
}

function generateNestedDataClasses(properties) {
    let nestedCode = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type === 'object' && prop.properties) {
            const nestedName = toPascalCase(key);
            // Recursively generate nested data classes first
            nestedCode += generateNestedDataClasses(prop.properties);
            nestedCode += generateDataClass(prop.properties, nestedName);
            nestedCode += '\n\n';
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = toPascalCase(key) + 'Item';
                nestedCode += generateNestedDataClasses(prop.itemType.properties);
                nestedCode += generateDataClass(prop.itemType.properties, nestedName);
                nestedCode += '\n\n';
            }
        }
    }

    return nestedCode;
}

function generateMultipleFiles(parsedData, typeName) {
    const className = toPascalCase(typeName);
    const files = [];

    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'object' && prop.properties) {
                const nestedName = toPascalCase(key);
                collectFiles(prop.properties);
                files.push({
                    filename: `${nestedName}.kt`,
                    content: generateDataClass(prop.properties, nestedName),
                    language: 'kotlin'
                });
            } else if (prop.type === 'array' && prop.itemType) {
                if (prop.itemType.type === 'object' && prop.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    collectFiles(prop.itemType.properties);
                    files.push({
                        filename: `${nestedName}.kt`,
                        content: generateDataClass(prop.itemType.properties, nestedName),
                        language: 'kotlin'
                    });
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    files.push({
        filename: `${className}.kt`,
        content: generateDataClass(parsedData.properties, className),
        language: 'kotlin'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName);
    }

    const className = toPascalCase(typeName);

    let code = '';

    // Generate nested data classes first
    const nestedClasses = generateNestedDataClasses(parsedData.properties);
    if (nestedClasses) {
        code += nestedClasses;
    }

    // Generate main data class
    code += generateDataClass(parsedData.properties, className);

    return code;
}

module.exports = { generate };
