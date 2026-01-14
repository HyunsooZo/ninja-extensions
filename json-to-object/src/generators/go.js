const { toPascalCase, collectNestedTypes } = require('../utils');

function typeToGo(typeInfo) {
    if (typeof typeInfo === 'string') {
        switch (typeInfo) {
            case 'string': return 'string';
            case 'integer': return 'int64';
            case 'number': return 'float64';
            case 'boolean': return 'bool';
            case 'null': return 'interface{}';
            default: return 'interface{}';
        }
    }

    if (typeInfo.type === 'array') {
        const itemType = typeToGo(typeInfo.itemType);
        return `[]${itemType}`;
    }

    if (typeInfo.type === 'object') {
        return 'interface{}';
    }

    switch (typeInfo.type) {
        case 'string': return 'string';
        case 'integer': return 'int64';
        case 'number': return 'float64';
        case 'boolean': return 'bool';
        case 'null': return 'interface{}';
        default: return 'interface{}';
    }
}

function getTypeForProperty(key, prop) {
    if (prop.type && typeof prop.type === 'object') {
        if (prop.type.type === 'object' && prop.type.properties) {
            return toPascalCase(key);
        }
        if (prop.type.type === 'array' && prop.type.itemType) {
            if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                return `[]${toPascalCase(key)}Item`;
            }
            return typeToGo(prop.type);
        }
    }
    return typeToGo(prop.type);
}

function generateStruct(properties, name) {
    let code = `type ${name} struct {\n`;

    const entries = Object.entries(properties);

    if (entries.length === 0) {
        code += `}\n`;
        return code;
    }

    for (const [key, prop] of entries) {
        const goType = getTypeForProperty(key, prop);
        const fieldName = toPascalCase(key);

        code += `\t${fieldName} ${goType} \`json:"${key}"\`\n`;
    }

    code += `}`;

    return code;
}

function generateNestedStructs(properties) {
    let nestedCode = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type && typeof prop.type === 'object') {
            if (prop.type.type === 'object' && prop.type.properties) {
                const nestedName = toPascalCase(key);
                // Recursively generate nested structs first
                nestedCode += generateNestedStructs(prop.type.properties);
                nestedCode += generateStruct(prop.type.properties, nestedName);
                nestedCode += '\n\n';
            } else if (prop.type.type === 'array' && prop.type.itemType) {
                if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
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

    let code = '';

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
