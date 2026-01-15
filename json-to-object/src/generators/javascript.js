const { toPascalCase, collectNestedTypes } = require('../utils');

function typeToJSDoc(typeInfo) {
    if (typeof typeInfo === 'string') {
        switch (typeInfo) {
            case 'string': return 'string';
            case 'integer': return 'number';
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'null': return 'null';
            default: return '*';
        }
    }

    if (typeInfo.type === 'array') {
        const itemType = typeToJSDoc(typeInfo.itemType);
        return `Array<${itemType}>`;
    }

    if (typeInfo.type === 'union') {
        const types = typeInfo.types.map(t => typeToJSDoc(t));
        return `(${types.join('|')})`;
    }

    if (typeInfo.type === 'object') {
        return 'Object';
    }

    switch (typeInfo.type) {
        case 'string': return 'string';
        case 'integer': return 'number';
        case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'null': return 'null';
        default: return '*';
    }
}

function getTypeForProperty(key, prop) {
    if (prop.type === 'object' && prop.properties) {
        return toPascalCase(key);
    }
    if (prop.type === 'array' && prop.itemType) {
        if (prop.itemType.type === 'object' && prop.itemType.properties) {
            return `Array<${toPascalCase(key)}Item>`;
        }
        const itemType = typeToJSDoc(prop.itemType);
        return `Array<${itemType}>`;
    }
    return typeToJSDoc(prop);
}

function generateClass(properties, name) {
    let code = `/**\n * @typedef {Object} ${name}\n`;

    for (const [key, prop] of Object.entries(properties)) {
        const jsType = getTypeForProperty(key, prop);
        code += ` * @property {${jsType}} ${key}\n`;
    }

    code += ' */\n\n';
    code += `class ${name} {\n`;
    code += `  constructor(data) {\n`;

    for (const key of Object.keys(properties)) {
        code += `    this.${key} = data.${key};\n`;
    }

    code += `  }\n`;
    code += `}`;

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

function generateMultipleFiles(parsedData, typeName) {
    const className = toPascalCase(typeName);
    const files = [];

    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type && typeof prop.type === 'object') {
                if (prop.type.type === 'object' && prop.type.properties) {
                    const nestedName = toPascalCase(key);
                    collectFiles(prop.type.properties);
                    files.push({
                        filename: `${nestedName}.js`,
                        content: generateClass(prop.type.properties, nestedName),
                        language: 'javascript'
                    });
                } else if (prop.type.type === 'array' && prop.type.itemType) {
                    if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                        const nestedName = toPascalCase(key) + 'Item';
                        collectFiles(prop.type.itemType.properties);
                        files.push({
                            filename: `${nestedName}.js`,
                            content: generateClass(prop.type.itemType.properties, nestedName),
                            language: 'javascript'
                        });
                    }
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    let mainContent = generateClass(parsedData.properties, className);
    if (parsedData.isArray) {
        mainContent += `\n\n/**\n * @type {Array<${className}>}\n */`;
    }
    files.push({
        filename: `${className}.js`,
        content: mainContent,
        language: 'javascript'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName);
    }

    const className = toPascalCase(typeName);

    let code = '';

    // Generate nested classes first
    const nestedClasses = generateNestedClasses(parsedData.properties);
    if (nestedClasses) {
        code += nestedClasses;
    }

    // Generate main class
    code += generateClass(parsedData.properties, className);

    if (parsedData.isArray) {
        code += `\n\n/**\n * @type {Array<${className}>}\n */`;
    }

    return code;
}

module.exports = { generate };
