const { toPascalCase, toCamelCase, collectNestedTypes } = require('../utils');

/**
 * @typedef {Object} JavaOptions
 * @property {boolean} [useJsonProperty] - @JsonProperty 어노테이션 추가
 * @property {boolean} [useLombok] - Lombok 사용 여부
 * @property {'none'|'data'|'getter-setter'} [lombokMode] - Lombok 모드: none, data(@Data), getter-setter(@Getter/@Setter)
 * @property {boolean} [includeConstructor] - 생성자 포함 (Lombok이 아닐 때)
 * @property {boolean} [includeGetterSetter] - Getter/Setter 포함 (Lombok이 아닐 때, 기본 true)
 * @property {boolean} [useInnerClass] - Inner class 사용
 * @property {boolean} [multipleFiles] - 여러 파일로 분리
 * @property {boolean} [useRecord] - Java record 사용 (Java 14+)
 */

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

    // Java doesn't support union types, use Object
    if (typeInfo.type === 'union') {
        return 'Object';
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
        const itemType = typeToJava(prop.itemType);
        return `List<${itemType}>`;
    }
    return typeToJava(prop);
}

function generateClass(properties, name, isNested = false, options = {}) {
    const indent = isNested ? '    ' : '';
    const modifier = isNested ? 'public static ' : 'public ';
    const { useJsonProperty, useLombok, lombokMode, includeConstructor, includeGetterSetter = true } = options;

    let code = '';

    // Lombok 어노테이션
    if (useLombok) {
        if (lombokMode === 'getter-setter') {
            code += `${indent}@Getter\n`;
            code += `${indent}@Setter\n`;
        } else {
            // lombokMode === 'data' or legacy support
            code += `${indent}@Data\n`;
        }
        code += `${indent}@NoArgsConstructor\n`;
        code += `${indent}@AllArgsConstructor\n`;
    }

    code += `${indent}${modifier}class ${name} {\n`;

    const entries = Object.entries(properties);

    // Member variables
    for (const [key, prop] of entries) {
        const javaType = getTypeForProperty(key, prop);
        const fieldName = toCamelCase(key);

        if (useJsonProperty && key !== fieldName) {
            code += `${indent}    @JsonProperty("${key}")\n`;
        }
        code += `${indent}    private ${javaType} ${fieldName};\n`;
    }

    if (entries.length === 0) {
        code += `${indent}    // Empty class\n`;
    }

    code += `\n`;

    // 생성자 (Lombok이 아닐 때)
    if (!useLombok && includeConstructor && entries.length > 0) {
        // NoArgsConstructor
        code += `${indent}    public ${name}() {\n`;
        code += `${indent}    }\n\n`;

        // AllArgsConstructor
        const params = entries.map(([key, prop]) => {
            const javaType = getTypeForProperty(key, prop);
            const fieldName = toCamelCase(key);
            return `${javaType} ${fieldName}`;
        }).join(', ');

        code += `${indent}    public ${name}(${params}) {\n`;
        for (const [key] of entries) {
            const fieldName = toCamelCase(key);
            code += `${indent}        this.${fieldName} = ${fieldName};\n`;
        }
        code += `${indent}    }\n\n`;
    }

    // Getter/Setter (Lombok이 아닐 때)
    if (!useLombok && includeGetterSetter) {
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
    }

    code += `${indent}}`;

    return code;
}

function generateNestedClasses(properties, useInnerClass = true, options = {}) {
    let nestedCode = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type === 'object' && prop.properties) {
            const nestedName = toPascalCase(key);
            // Recursively generate nested classes first
            nestedCode += generateNestedClasses(prop.properties, useInnerClass, options);
            nestedCode += generateClass(prop.properties, nestedName, useInnerClass, options);
            nestedCode += '\n\n';
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = toPascalCase(key) + 'Item';
                nestedCode += generateNestedClasses(prop.itemType.properties, useInnerClass, options);
                nestedCode += generateClass(prop.itemType.properties, nestedName, useInnerClass, options);
                nestedCode += '\n\n';
            }
        }
    }

    return nestedCode;
}

function generateSeparateClasses(properties, options = {}) {
    let separateCode = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type === 'object' && prop.properties) {
            const nestedName = toPascalCase(key);
            // Recursively generate nested classes first
            separateCode += generateSeparateClasses(prop.properties, options);
            separateCode += generateClass(prop.properties, nestedName, false, options);
            separateCode += '\n\n';
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = toPascalCase(key) + 'Item';
                separateCode += generateSeparateClasses(prop.itemType.properties, options);
                separateCode += generateClass(prop.itemType.properties, nestedName, false, options);
                separateCode += '\n\n';
            }
        }
    }

    return separateCode;
}

function buildImports(options = {}) {
    let imports = 'import java.util.List;\n';
    if (options.useJsonProperty) {
        imports += 'import com.fasterxml.jackson.annotation.JsonProperty;\n';
    }
    if (options.useLombok && !options.useRecord) {
        if (options.lombokMode === 'getter-setter') {
            imports += 'import lombok.Getter;\n';
            imports += 'import lombok.Setter;\n';
        } else {
            imports += 'import lombok.Data;\n';
        }
        imports += 'import lombok.NoArgsConstructor;\n';
        imports += 'import lombok.AllArgsConstructor;\n';
    }
    imports += '\n';
    return imports;
}

/**
 * Java record 클래스 생성
 */
function generateRecord(properties, name, options = {}) {
    const { useJsonProperty } = options;
    const entries = Object.entries(properties);

    let code = `public record ${name}(\n`;

    for (let i = 0; i < entries.length; i++) {
        const [key, prop] = entries[i];
        const javaType = getTypeForProperty(key, prop);
        const fieldName = toCamelCase(key);
        const isLast = i === entries.length - 1;

        if (useJsonProperty && key !== fieldName) {
            code += `    @JsonProperty("${key}") `;
        } else {
            code += `    `;
        }
        code += `${javaType} ${fieldName}${isLast ? '' : ','}\n`;
    }

    if (entries.length === 0) {
        code = `public record ${name}(`;
    }

    code += `) {}`;

    return code;
}

/**
 * 중첩된 record 클래스들을 생성 (별도 record로)
 */
function generateNestedRecords(properties, options = {}) {
    let recordsCode = '';

    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type === 'object' && prop.properties) {
            const nestedName = toPascalCase(key);
            recordsCode += generateNestedRecords(prop.properties, options);
            recordsCode += generateRecord(prop.properties, nestedName, options);
            recordsCode += '\n\n';
        } else if (prop.type === 'array' && prop.itemType) {
            if (prop.itemType.type === 'object' && prop.itemType.properties) {
                const nestedName = toPascalCase(key) + 'Item';
                recordsCode += generateNestedRecords(prop.itemType.properties, options);
                recordsCode += generateRecord(prop.itemType.properties, nestedName, options);
                recordsCode += '\n\n';
            }
        }
    }

    return recordsCode;
}

/**
 * 여러 파일로 record 생성
 */
function generateMultipleRecordFiles(parsedData, typeName, options = {}) {
    const className = toPascalCase(typeName);
    const files = [];
    const imports = buildImports(options);

    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'object' && prop.properties) {
                const nestedName = toPascalCase(key);
                collectFiles(prop.properties);
                files.push({
                    filename: `${nestedName}.java`,
                    content: imports + generateRecord(prop.properties, nestedName, options),
                    language: 'java'
                });
            } else if (prop.type === 'array' && prop.itemType) {
                if (prop.itemType.type === 'object' && prop.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    collectFiles(prop.itemType.properties);
                    files.push({
                        filename: `${nestedName}.java`,
                        content: imports + generateRecord(prop.itemType.properties, nestedName, options),
                        language: 'java'
                    });
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    // Generate main record
    files.push({
        filename: `${className}.java`,
        content: imports + generateRecord(parsedData.properties, className, options),
        language: 'java'
    });

    return files;
}

function generateMultipleFiles(parsedData, typeName, options = {}) {
    const className = toPascalCase(typeName);
    const files = [];
    const imports = buildImports(options);

    function collectFiles(properties) {
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === 'object' && prop.properties) {
                const nestedName = toPascalCase(key);
                collectFiles(prop.properties);
                files.push({
                    filename: `${nestedName}.java`,
                    content: imports + generateClass(prop.properties, nestedName, false, options),
                    language: 'java'
                });
            } else if (prop.type === 'array' && prop.itemType) {
                if (prop.itemType.type === 'object' && prop.itemType.properties) {
                    const nestedName = toPascalCase(key) + 'Item';
                    collectFiles(prop.itemType.properties);
                    files.push({
                        filename: `${nestedName}.java`,
                        content: imports + generateClass(prop.itemType.properties, nestedName, false, options),
                        language: 'java'
                    });
                }
            }
        }
    }

    collectFiles(parsedData.properties);

    // Generate main class
    files.push({
        filename: `${className}.java`,
        content: imports + generateClass(parsedData.properties, className, false, options),
        language: 'java'
    });

    return files;
}

function generate(parsedData, typeName, options = {}) {
    // Record 타입 처리
    if (options.useRecord) {
        if (options.multipleFiles) {
            return generateMultipleRecordFiles(parsedData, typeName, options);
        }

        const className = toPascalCase(typeName);
        let code = buildImports(options);

        // 중첩된 record들 먼저 생성
        const nestedRecords = generateNestedRecords(parsedData.properties, options);
        if (nestedRecords) {
            code += nestedRecords;
        }

        // 메인 record 생성
        code += generateRecord(parsedData.properties, className, options);

        return code;
    }

    // 일반 Class 처리
    if (options.multipleFiles) {
        return generateMultipleFiles(parsedData, typeName, options);
    }

    const className = toPascalCase(typeName);
    const useInnerClass = options.useInnerClass !== false; // 기본값 true

    let code = buildImports(options);

    if (!useInnerClass) {
        // 별도 클래스로 생성 (메인 클래스 앞에)
        const separateClasses = generateSeparateClasses(parsedData.properties, options);
        if (separateClasses) {
            code += separateClasses;
        }
    }

    // 메인 클래스 생성
    code += generateClass(parsedData.properties, className, false, options);

    if (useInnerClass) {
        // Inner class 사용 시 메인 클래스 닫기 전에 nested classes 추가
        // generateClass가 이미 닫는 중괄호를 포함하므로 다시 열어야 함
        code = code.slice(0, -1); // 마지막 } 제거
        const nestedClasses = generateNestedClasses(parsedData.properties, true, options);
        if (nestedClasses) {
            code += '\n' + nestedClasses;
        }
        code += '}';
    }

    return code;
}

module.exports = { generate };
