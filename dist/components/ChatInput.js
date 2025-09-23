"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatInput = void 0;
const react_1 = __importStar(require("react"));
const ink_1 = require("ink");
const ink_text_input_1 = __importDefault(require("ink-text-input"));
const ChatInput = ({ onSubmit, isDisabled }) => {
    const [inputValue, setInputValue] = (0, react_1.useState)('');
    const [inputLines, setInputLines] = (0, react_1.useState)(['']);
    const [currentLineIndex, setCurrentLineIndex] = (0, react_1.useState)(0);
    const [isMultiline, setIsMultiline] = (0, react_1.useState)(false);
    (0, ink_1.useInput)((input, key) => {
        if (isDisabled)
            return;
        if (key.ctrl && key.return) {
            const fullText = inputLines.join('\n').trim();
            if (fullText) {
                onSubmit(fullText);
                setInputLines(['']);
                setCurrentLineIndex(0);
                setInputValue('');
                setIsMultiline(false);
            }
        }
        else if (key.ctrl && input === 'l') {
            setInputLines(['']);
            setCurrentLineIndex(0);
            setInputValue('');
            setIsMultiline(false);
        }
        else if (key.return && !key.ctrl && !key.shift) {
            const newLines = [...inputLines];
            newLines.splice(currentLineIndex + 1, 0, '');
            setInputLines(newLines);
            setCurrentLineIndex(currentLineIndex + 1);
            setInputValue('');
            setIsMultiline(true);
        }
    });
    const handleInputChange = (value) => {
        if (isDisabled)
            return;
        setInputValue(value);
        const newLines = [...inputLines];
        newLines[currentLineIndex] = value;
        setInputLines(newLines);
    };
    const displayText = inputLines.join('\n');
    const lineCount = inputLines.length;
    return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", borderStyle: "single", paddingX: 1 },
        react_1.default.createElement(ink_1.Box, { marginBottom: 1 },
            react_1.default.createElement(ink_1.Text, { color: "gray", dimColor: true },
                isMultiline ? 'Multi-line mode - ' : '',
                "Press Ctrl+Enter to send, Enter for new line")),
        lineCount > 1 && (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 }, inputLines.slice(0, currentLineIndex).map((line, index) => (react_1.default.createElement(ink_1.Text, { key: index, color: "cyan" }, line || ' '))))),
        react_1.default.createElement(ink_1.Box, null,
            react_1.default.createElement(ink_1.Text, { color: "cyan", bold: true }, '> '),
            !isDisabled ? (react_1.default.createElement(ink_text_input_1.default, { value: inputValue, onChange: handleInputChange, placeholder: currentLineIndex === 0 && !isMultiline ? "Type your message..." : "" })) : (react_1.default.createElement(ink_1.Text, { color: "gray" }, "Waiting for response..."))),
        lineCount > 1 && currentLineIndex < lineCount - 1 && (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginTop: 1 }, inputLines.slice(currentLineIndex + 1).map((line, index) => (react_1.default.createElement(ink_1.Text, { key: index, color: "cyan", dimColor: true }, line || ' ')))))));
};
exports.ChatInput = ChatInput;
//# sourceMappingURL=ChatInput.js.map