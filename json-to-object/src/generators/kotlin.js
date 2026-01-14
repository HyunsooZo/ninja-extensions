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
    if (prop.type && typeof prop.type === 'object') {
        if (prop.type.type === 'object' && prop.type.properties) {
            return toPascalCase(key);
        }
        if (prop.type.type === 'array' && prop.type.itemType) {
            if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                return `List<${toPascalCase(key)}Item>`;
            }
            return typeToKotlin(prop.type);
        }
    }
    return typeToKotlin(prop.type);
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
        if (prop.type && typeof prop.type === 'object') {
            if (prop.type.type === 'object' && prop.type.properties) {
                const nestedName = toPascalCase(key);
                // Recursively generate nested data classes first
                nestedCode += generateNestedDataClasses(prop.type.properties);
                nestedCode += generateDataClass(prop.type.properties, nestedName);
                nestedCode += '\n\n';
            } else if (prop.type.type === 'array' && prop.type.itemType) {
                if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    nestedCode += generateNestedDataClasses(prop.type.itemType.properties);
                    nestedCode += generateDataClass(prop.type.itemType.properties, nestedName);
                    nestedCode += '\n\n';
                }
            }
        }
    }

    return nestedCode;
}

function generate(parsedData, typeName) {
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
