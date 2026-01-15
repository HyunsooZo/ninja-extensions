const { toPascalCase, toSnakeCase, collectNestedTypes } = require('../utils');

function typeToPython(typeInfo, nestedTypes = []) {
    if (typeof typeInfo === 'string') {
        switch (typeInfo) {
            case 'string': return 'str';
            case 'integer': return 'int';
            case 'number': return 'float';
            case 'boolean': return 'bool';
            case 'null': return 'None';
            default: return 'Any';
        }
    }

    if (typeInfo.type === 'array') {
        const itemType = typeToPython(typeInfo.itemType, nestedTypes);
        return `list[${itemType}]`;
    }

    if (typeInfo.type === 'object') {
        // Check if this is a nested object that has a corresponding class
        return 'dict';  // Will be replaced with actual class name in generateDataclass
    }

    switch (typeInfo.type) {
        case 'string': return 'str';
        case 'integer': return 'int';
        case 'number': return 'float';
        case 'boolean': return 'bool';
        case 'null': return 'None';
        default: return 'Any';
    }
}

function getTypeForProperty(key, prop, nestedTypes) {
    if (prop.type === 'object' && prop.properties) {
        return toPascalCase(key);
    }
    if (prop.type === 'array' && prop.itemType) {
        if (prop.itemType.type === 'object' && prop.itemType.properties) {
            return `list[${toPascalCase(key)}Item]`;
        }
        return typeToPython(prop.itemType, nestedTypes);
    }
    return typeToPython(prop, nestedTypes);
}

function generateDataclass(properties, name, nestedTypes) {
    let code = `@dataclass\n`;
    code += `class ${name}:\n`;

    const entries = Object.entries(properties);
    if (entries.length === 0) {
        code += `    pass\n`;
        return code;
    }

    for (const [key, prop] of entries) {
        const pyType = getTypeForProperty(key, prop, nestedTypes);
        const fieldName = toSnakeCase(key);
        code += `    ${fieldName}: ${pyType}\n`;
    }

    return code;
}

function generateMultipleFiles(parsedData, typeName) {
    const className = toPascalCase(typeName);
    const nestedTypes = collectNestedTypes(parsedData.properties, className);
    const files = [];

    const imports = 'from dataclasses import dataclass\nfrom typing import Any\n\n';

    // Generate nested classes as separate files
    for (const nested of nestedTypes) {
        files.push({
            filename: `${nested.name}.py`,
            content: imports + generateDataclass(nested.properties, nested.name, nestedTypes),
            language: 'python'
        });
    }

    // Generate main class
    files.push({
        filename: `${className}.py`,
        content: imports + generateDataclass(parsedData.properties, className, nestedTypes),
        language: 'python'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName);
    }

    const className = toPascalCase(typeName);
    const nestedTypes = collectNestedTypes(parsedData.properties, className);

    let code = 'from dataclasses import dataclass\nfrom typing import Any\n\n';

    // Generate nested classes first (in reverse order for proper dependency)
    const reversedNested = [...nestedTypes].reverse();
    for (const nested of reversedNested) {
        code += generateDataclass(nested.properties, nested.name, nestedTypes);
        code += '\n';
    }

    // Generate main class
    code += generateDataclass(parsedData.properties, className, nestedTypes);

    return code;
}

module.exports = { generate };
