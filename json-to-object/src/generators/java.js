const { toPascalCase, toCamelCase, collectNestedTypes } = require('../utils');

function typeToJava(typeInfo) {
    if (typeof typeInfo === 'string') {
        switch (typeInfo) {
            case 'string': return 'String';
            case 'integer': return 'Integer';
            case 'number': return 'Double';
            case 'boolean': return 'Boolean';
            case 'null': return 'Object';
            default: return 'Object';
        }
    }

    if (typeInfo.type === 'array') {
        const itemType = typeToJava(typeInfo.itemType);
        return `List<${itemType}>`;
    }

    if (typeInfo.type === 'object') {
        return 'Object';
    }

    switch (typeInfo.type) {
        case 'string': return 'String';
        case 'integer': return 'Integer';
        case 'number': return 'Double';
        case 'boolean': return 'Boolean';
        case 'null': return 'Object';
        default: return 'Object';
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
            return typeToJava(prop.type);
        }
    }
    return typeToJava(prop.type);
}

function generateClass(properties, name, isNested = false) {
    const indent = isNested ? '    ' : '';
    const modifier = isNested ? 'public static ' : 'public ';

    let code = `${indent}${modifier}class ${name} {\n`;

    const entries = Object.entries(properties);

    // Member variables
    for (const [key, prop] of entries) {
        const javaType = getTypeForProperty(key, prop);
        const fieldName = toCamelCase(key);
        code += `${indent}    private ${javaType} ${fieldName};\n`;
    }

    if (entries.length === 0) {
        code += `${indent}    // Empty class\n`;
    }

    code += `\n`;

    // Getter/Setter
    for (const [key, prop] of entries) {
        const javaType = getTypeForProperty(key, prop);
        const fieldName = toCamelCase(key);
        const capitalizedField = toPascalCase(key);

        // Getter
        code += `${indent}    public ${javaType} get${capitalizedField}() {\n`;
        code += `${indent}        return ${fieldName};\n`;
        code += `${indent}    }\n\n`;

        // Setter
        code += `${indent}    public void set${capitalizedField}(${javaType} ${fieldName}) {\n`;
        code += `${indent}        this.${fieldName} = ${fieldName};\n`;
        code += `${indent}    }\n\n`;
    }

    code += `${indent}}`;

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
                nestedCode += generateClass(prop.type.properties, nestedName, true);
                nestedCode += '\n\n';
            } else if (prop.type.type === 'array' && prop.type.itemType) {
                if (prop.type.itemType.type === 'object' && prop.type.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    nestedCode += generateNestedClasses(prop.type.itemType.properties);
                    nestedCode += generateClass(prop.type.itemType.properties, nestedName, true);
                    nestedCode += '\n\n';
                }
            }
        }
    }

    return nestedCode;
}

function generate(parsedData, typeName) {
    const className = toPascalCase(typeName);

    let code = `import java.util.List;\n\n`;
    code += `public class ${className} {\n`;

    const entries = Object.entries(parsedData.properties);

    // Member variables
    for (const [key, prop] of entries) {
        const javaType = getTypeForProperty(key, prop);
        const fieldName = toCamelCase(key);
        code += `    private ${javaType} ${fieldName};\n`;
    }

    if (entries.length === 0) {
        code += `    // Empty class\n`;
    }

    code += `\n`;

    // Getter/Setter
    for (const [key, prop] of entries) {
        const javaType = getTypeForProperty(key, prop);
        const fieldName = toCamelCase(key);
        const capitalizedField = toPascalCase(key);

        // Getter
        code += `    public ${javaType} get${capitalizedField}() {\n`;
        code += `        return ${fieldName};\n`;
        code += `    }\n\n`;

        // Setter
        code += `    public void set${capitalizedField}(${javaType} ${fieldName}) {\n`;
        code += `        this.${fieldName} = ${fieldName};\n`;
        code += `    }\n\n`;
    }

    // Generate nested static classes
    const nestedClasses = generateNestedClasses(parsedData.properties);
    if (nestedClasses) {
        code += nestedClasses;
    }

    code += `}`;

    return code;
}

module.exports = { generate };
