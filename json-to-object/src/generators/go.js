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
    if (prop.type === 'object' && prop.properties) {
        return toPascalCase(key);
    }
    if (prop.type === 'array' && prop.itemType) {
        if (prop.itemType.type === 'object' && prop.itemType.properties) {
            return `[]${toPascalCase(key)}Item`;
        }
        return typeToGo(prop.itemType);
    }
    return typeToGo(prop);
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
        if (prop.type === 'object' && prop.properties) {
            const nestedName = toPascalCase(key);
            // Recursively generate nested structs first
            nestedCode += generateNestedStructs(prop.properties);
            nestedCode += generateStruct(prop.properties, nestedName);
            nestedCode += '\n\n';
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = toPascalCase(key) + 'Item';
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

    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'object' && prop.properties) {
                const nestedName = toPascalCase(key);
                collectFiles(prop.properties);
                files.push({
                    filename: `${nestedName}.go`,
                    content: generateStruct(prop.properties, nestedName),
                    language: 'go'
                });
            } else if (prop.type === 'array' && prop.itemType) {
                if (prop.itemType.type === 'object' && prop.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    collectFiles(prop.itemType.properties);
                    files.push({
                        filename: `${nestedName}.go`,
                        content: generateStruct(prop.itemType.properties, nestedName),
                        language: 'go'
                    });
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    files.push({
        filename: `${structName}.go`,
        content: generateStruct(parsedData.properties, structName),
        language: 'go'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName);
    }

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
