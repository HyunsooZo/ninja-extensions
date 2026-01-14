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
    if (prop.type && typeof prop.type === 'object') {
        if (prop.type.type === 'object' && prop.type.properties) {
            return toPascalCase(key);
        }
        if (prop.type.type === 'array' && prop.type.itemType) {
            if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                return `Vec<${toPascalCase(key)}Item>`;
            }
            return typeToRust(prop.type);
        }
    }
    return typeToRust(prop.type);
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
