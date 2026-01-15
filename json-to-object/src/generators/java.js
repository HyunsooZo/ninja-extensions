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
    if (prop.type === 'object' && prop.properties) {
        return toPascalCase(key);
    }
    if (prop.type === 'array' && prop.itemType) {
        if (prop.itemType.type === 'object' && prop.itemType.properties) {
            return `List<${toPascalCase(key)}Item>`;
        }
        return typeToJava(prop.itemType);
    }
    return typeToJava(prop);
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

function generateNestedClasses(properties, useInnerClass = true) {
    let nestedCode = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type === 'object' && prop.properties) {
            const nestedName = toPascalCase(key);
            // Recursively generate nested classes first
            nestedCode += generateNestedClasses(prop.properties, useInnerClass);
            nestedCode += generateClass(prop.properties, nestedName, useInnerClass);
            nestedCode += '\n\n';
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = toPascalCase(key) + 'Item';
                nestedCode += generateNestedClasses(prop.itemType.properties, useInnerClass);
                nestedCode += generateClass(prop.itemType.properties, nestedName, useInnerClass);
                nestedCode += '\n\n';
            }
        }
    }

    return nestedCode;
}

function generateSeparateClasses(properties) {
    let separateCode = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type === 'object' && prop.properties) {
            const nestedName = toPascalCase(key);
            // Recursively generate nested classes first
            separateCode += generateSeparateClasses(prop.properties);
            separateCode += generateClass(prop.properties, nestedName, false);
            separateCode += '\n\n';
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = toPascalCase(key) + 'Item';
                separateCode += generateSeparateClasses(prop.itemType.properties);
                separateCode += generateClass(prop.itemType.properties, nestedName, false);
                separateCode += '\n\n';
            }
        }
    }

    return separateCode;
}

function generateMultipleFiles(parsedData, typeName) {
    const className = toPascalCase(typeName);
    const files = [];
    const imports = `import java.util.List;\n\n`;

    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'object' && prop.properties) {
                const nestedName = toPascalCase(key);
                collectFiles(prop.properties);
                files.push({
                    filename: `${nestedName}.java`,
                    content: imports + generateClass(prop.properties, nestedName, false),
                    language: 'java'
                });
            } else if (prop.type === 'array' && prop.itemType) {
                if (prop.itemType.type === 'object' && prop.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    collectFiles(prop.itemType.properties);
                    files.push({
                        filename: `${nestedName}.java`,
                        content: imports + generateClass(prop.itemType.properties, nestedName, false),
                        language: 'java'
                    });
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    // Generate main class
    let mainCode = imports + `public class ${className} {\n`;
    const entries = Object.entries(parsedData.properties);

    for (const [key, prop] of entries) {
        const javaType = getTypeForProperty(key, prop);
        const fieldName = toCamelCase(key);
        mainCode += `    private ${javaType} ${fieldName};\n`;
    }

    if (entries.length === 0) {
        mainCode += `    // Empty class\n`;
    }

    mainCode += `\n`;

    for (const [key, prop] of entries) {
        const javaType = getTypeForProperty(key, prop);
        const fieldName = toCamelCase(key);
        const capitalizedField = toPascalCase(key);

        mainCode += `    public ${javaType} get${capitalizedField}() {\n`;
        mainCode += `        return ${fieldName};\n`;
        mainCode += `    }\n\n`;

        mainCode += `    public void set${capitalizedField}(${javaType} ${fieldName}) {\n`;
        mainCode += `        this.${fieldName} = ${fieldName};\n`;
        mainCode += `    }\n\n`;
    }

    mainCode += `}`;

    files.push({
        filename: `${className}.java`,
        content: mainCode,
        language: 'java'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName);
    }

    const className = toPascalCase(typeName);
    const useInnerClass = options.useInnerClass !== false; // 기본값 true

    let code = `import java.util.List;\n\n`;

    if (!useInnerClass) {
        // 별도 클래스로 생성 (메인 클래스 앞에)
        const separateClasses = generateSeparateClasses(parsedData.properties);
        if (separateClasses) {
            code += separateClasses;
        }
    }

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

    if (useInnerClass) {
        // Generate nested static classes
        const nestedClasses = generateNestedClasses(parsedData.properties, true);
        if (nestedClasses) {
            code += nestedClasses;
        }
    }

    code += `}`;

    return code;
}

module.exports = { generate };
