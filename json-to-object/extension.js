const vscode = require('vscode');
const { parseJson } = require('./src/parser');
const generators = require('./src/generators');

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

            // 타입명 입력 받기
            const typeName = await vscode.window.showInputBox({
                prompt: 'Enter the name for the type/class',
                value: 'MyObject'
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

            const generatedCode = generator.generate(parsedData, typeName);

            // 새 문서에 표시
            const doc = await vscode.workspace.openTextDocument({
                content: generatedCode,
                language: language.value === 'cpp' ? 'cpp' : language.value
            });

            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`Successfully converted to ${language.label}`);

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
