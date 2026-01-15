const vscode = require('vscode');
const { parseJson } = require('./src/parser');
const generators = require('./src/generators');

// 주요 언어들의 예약어
const RESERVED_WORDS = new Set([
    // JavaScript/TypeScript
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for',
    'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null',
    'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try',
    'typeof', 'var', 'void', 'while', 'with', 'yield', 'enum', 'await',
    'interface', 'type', 'public', 'private', 'protected', 'implements',
    // Python
    'def', 'lambda', 'pass', 'raise', 'global', 'nonlocal', 'assert', 'from', 'as',
    'and', 'or', 'not', 'is', 'None', 'True', 'False', 'async',
    // Java/Kotlin
    'abstract', 'boolean', 'byte', 'char', 'double', 'final', 'float', 'int',
    'long', 'native', 'package', 'short', 'synchronized', 'throws', 'transient',
    'volatile', 'goto', 'strictfp', 'sealed', 'permits', 'record', 'val', 'var',
    'fun', 'object', 'when', 'companion', 'data', 'inline', 'lateinit', 'override',
    // Go
    'chan', 'defer', 'fallthrough', 'go', 'map', 'range', 'select', 'struct',
    // Rust
    'crate', 'dyn', 'extern', 'fn', 'impl', 'loop', 'match', 'mod', 'move',
    'mut', 'pub', 'ref', 'self', 'Self', 'trait', 'unsafe', 'use', 'where',
    // C/C++
    'auto', 'register', 'signed', 'sizeof', 'typedef', 'union', 'unsigned',
    'asm', 'template', 'typename', 'virtual', 'namespace', 'using', 'operator',
    'friend', 'inline', 'explicit', 'mutable', 'constexpr', 'decltype', 'nullptr'
]);

/**
 * 타입명 유효성 검사
 * @param {string} name - 검사할 타입명
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTypeName(name) {
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Type name cannot be empty' };
    }

    const trimmed = name.trim();

    // 숫자로 시작하는지 체크
    if (/^[0-9]/.test(trimmed)) {
        return { valid: false, error: 'Type name cannot start with a number' };
    }

    // 허용된 문자만 포함하는지 체크 (알파벳, 숫자, 언더스코어)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
        return { valid: false, error: 'Type name can only contain letters, numbers, and underscores' };
    }

    // 예약어 체크
    if (RESERVED_WORDS.has(trimmed) || RESERVED_WORDS.has(trimmed.toLowerCase())) {
        return { valid: false, error: `"${trimmed}" is a reserved word in some languages` };
    }

    return { valid: true };
}

function activate(context) {
    let disposable = vscode.commands.registerCommand('json-to-object.convertJson', async function () {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showErrorMessage('Please select JSON text first');
            return;
        }

        // 언어 선택
        const language = await vscode.window.showQuickPick([
            { label: 'TypeScript', value: 'typescript' },
            { label: 'JavaScript', value: 'javascript' },
            { label: 'Python', value: 'python' },
            { label: 'Rust', value: 'rust' },
            { label: 'Go', value: 'go' },
            { label: 'C', value: 'c' },
            { label: 'C++', value: 'cpp' },
            { label: 'Java', value: 'java' },
            { label: 'Kotlin', value: 'kotlin' }
        ], {
            placeHolder: 'Select target language'
        });

        if (!language) {
            return;
        }

        try {
            // JSON 파싱
            const parsedData = parseJson(selectedText);

            // 타입명 입력 받기 (유효성 검사 포함)
            const typeName = await vscode.window.showInputBox({
                prompt: 'Enter the name for the type/class',
                value: 'MyObject',
                validateInput: (value) => {
                    const result = validateTypeName(value);
                    return result.valid ? null : result.error;
                }
            });

            if (!typeName) {
                return;
            }

            // 코드 생성
            const generator = generators[language.value];
            if (!generator) {
                vscode.window.showErrorMessage(`Generator for ${language.label} not implemented yet`);
                return;
            }

            // 출력 모드 선택
            const outputMode = await vscode.window.showQuickPick([
                { label: 'Single file', value: 'single' },
                { label: 'Multiple tabs (per type)', value: 'multiple' }
            ], {
                placeHolder: 'How should the output be organized?'
            });

            if (!outputMode) {
                return;
            }

            let options = {
                multipleFiles: outputMode.value === 'multiple'
            };

            // Java/Kotlin 공통: @JsonProperty 옵션
            if (language.value === 'java' || language.value === 'kotlin') {
                const jsonPropertyChoice = await vscode.window.showQuickPick([
                    { label: 'No @JsonProperty', value: false },
                    { label: 'Add @JsonProperty (for snake_case fields)', value: true }
                ], {
                    placeHolder: 'Add @JsonProperty annotations?'
                });

                if (!jsonPropertyChoice) {
                    return;
                }
                options.useJsonProperty = jsonPropertyChoice.value;
            }

            // Java 전용 옵션
            if (language.value === 'java') {
                // Class vs Record 선택
                const classTypeChoice = await vscode.window.showQuickPick([
                    { label: 'Class (traditional)', value: 'class' },
                    { label: 'Record (Java 14+)', value: 'record' }
                ], {
                    placeHolder: 'Generate as Class or Record?'
                });

                if (!classTypeChoice) {
                    return;
                }
                options.useRecord = classTypeChoice.value === 'record';

                // Record가 아닐 때만 Lombok/생성자/getter-setter 옵션 표시
                if (!options.useRecord) {
                    // Lombok 옵션
                    const lombokChoice = await vscode.window.showQuickPick([
                        { label: 'Plain POJO (no Lombok)', value: 'none' },
                        { label: 'Use Lombok @Data (@Data, @AllArgsConstructor, @NoArgsConstructor)', value: 'data' },
                        { label: 'Use Lombok @Getter/@Setter (@Getter, @Setter, @AllArgsConstructor, @NoArgsConstructor)', value: 'getter-setter' }
                    ], {
                        placeHolder: 'Use Lombok annotations?'
                    });

                    if (!lombokChoice) {
                        return;
                    }
                    options.lombokMode = lombokChoice.value; // 'none', 'data', 'getter-setter'
                    options.useLombok = lombokChoice.value !== 'none';

                    // Lombok이 아닐 때만 생성자/getter-setter 옵션 표시
                    if (!options.useLombok) {
                        const constructorChoice = await vscode.window.showQuickPick([
                            { label: 'No constructors', value: false },
                            { label: 'Include constructors (NoArgs + AllArgs)', value: true }
                        ], {
                            placeHolder: 'Include constructors?'
                        });

                        if (!constructorChoice) {
                            return;
                        }
                        options.includeConstructor = constructorChoice.value;

                        const getterSetterChoice = await vscode.window.showQuickPick([
                            { label: 'Include Getter/Setter', value: true },
                            { label: 'Fields only (no Getter/Setter)', value: false }
                        ], {
                            placeHolder: 'Include Getter/Setter methods?'
                        });

                        if (!getterSetterChoice) {
                            return;
                        }
                        options.includeGetterSetter = getterSetterChoice.value;
                    }

                    // 이너 클래스 옵션 (single file 모드일 때만)
                    if (!options.multipleFiles) {
                        const innerClassChoice = await vscode.window.showQuickPick([
                            { label: 'Inner Class (static nested)', value: true },
                            { label: 'Separate Classes', value: false }
                        ], {
                            placeHolder: 'How should nested objects be generated?'
                        });

                        if (!innerClassChoice) {
                            return;
                        }
                        options.useInnerClass = innerClassChoice.value;
                    }
                }
            }

            const result = generator.generate(parsedData, typeName, options);

            // 결과 처리
            if (Array.isArray(result)) {
                // 여러 탭으로 열기
                for (const file of result) {
                    const doc = await vscode.workspace.openTextDocument({
                        content: file.content,
                        language: file.language
                    });
                    await vscode.window.showTextDocument(doc, { preview: false });
                }
                vscode.window.showInformationMessage(`Successfully converted to ${language.label} (${result.length} files)`);
            } else {
                // 단일 파일
                const doc = await vscode.workspace.openTextDocument({
                    content: result,
                    language: language.value === 'cpp' ? 'cpp' : language.value
                });
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage(`Successfully converted to ${language.label}`);
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
};
