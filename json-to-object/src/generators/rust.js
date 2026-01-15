const { toPascalCase, toSnakeCase, collectNestedTypes } = require('../utils');

function typeToRust(typeInfo) {
    if (typeof typeInfo === 'string') {
        switch (typeInfo) {
            case 'string': return 'String';
            case 'integer': return 'i64';
            case 'number': return 'f64';
            case 'boolean': return 'bool';
            case 'null': return 'Option<()>';
            default: return 'serde_json::Value';
        }
    }

    if (typeInfo.type === 'array') {
        const itemType = typeToRust(typeInfo.itemType);
        return `Vec<${itemType}>`;
    }

    // Rust doesn't have native union types, use serde_json::Value
    if (typeInfo.type === 'union') {
        return 'serde_json::Value';
    }

    if (typeInfo.type === 'object') {
        return 'serde_json::Value';
    }

    switch (typeInfo.type) {
        case 'string': return 'String';
        case 'integer': return 'i64';
        case 'number': return 'f64';
        case 'boolean': return 'bool';
        case 'null': return 'Option<()>';
        default: return 'serde_json::Value';
    }
}

function getTypeForProperty(key, prop) {
    if (prop.type === 'object' && prop.properties) {
        return toPascalCase(key);
    }
    if (prop.type === 'array' && prop.itemType) {
        if (prop.itemType.type === 'object' && prop.itemType.properties) {
            return `Vec<${toPascalCase(key)}Item>`;
        }
        const itemType = typeToRust(prop.itemType);
        return `Vec<${itemType}>`;
    }
    return typeToRust(prop);
}

function generateStruct(properties, name) {
    let code = `#[derive(Debug, Serialize, Deserialize)]\n`;
    code += `pub struct ${name} {\n`;

    const entries = Object.entries(properties);
    if (entries.length === 0) {
        code += `}\n`;
        return code;
    }

    for (const [key, prop] of entries) {
        const rustType = getTypeForProperty(key, prop);
        const fieldName = toSnakeCase(key);

        if (fieldName !== key) {
            code += `    #[serde(rename = "${key}")]\n`;
        }
        code += `    pub ${fieldName}: ${rustType},\n`;
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
    const imports = 'use serde::{Deserialize, Serialize};\n\n';

    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'object' && prop.properties) {
                const nestedName = toPascalCase(key);
                collectFiles(prop.properties);
                files.push({
                    filename: `${toSnakeCase(nestedName)}.rs`,
                    content: imports + generateStruct(prop.properties, nestedName),
                    language: 'rust'
                });
            } else if (prop.type === 'array' && prop.itemType) {
                if (prop.itemType.type === 'object' && prop.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    collectFiles(prop.itemType.properties);
                    files.push({
                        filename: `${toSnakeCase(nestedName)}.rs`,
                        content: imports + generateStruct(prop.itemType.properties, nestedName),
                        language: 'rust'
                    });
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    files.push({
        filename: `${toSnakeCase(structName)}.rs`,
        content: imports + generateStruct(parsedData.properties, structName),
        language: 'rust'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName);
    }

    const structName = toPascalCase(typeName);

    let code = 'use serde::{Deserialize, Serialize};\n\n';

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
