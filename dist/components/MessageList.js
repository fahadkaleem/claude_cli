"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageList = void 0;
const react_1 = __importDefault(require("react"));
const ink_1 = require("ink");
const MessageList = ({ messages, currentStreamMessage, isLoading }) => {
    return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", marginBottom: 1 },
        messages.map((message, index) => (react_1.default.createElement(ink_1.Box, { key: index, marginBottom: 1 },
            react_1.default.createElement(ink_1.Box, null,
                react_1.default.createElement(ink_1.Text, { color: message.role === 'user' ? 'cyan' :
                        message.role === 'assistant' ? 'green' :
                            'gray', bold: true }, message.role === 'user' ? 'You: ' :
                    message.role === 'assistant' ? 'Claude: ' :
                        'System: ')),
            react_1.default.createElement(ink_1.Box, { marginLeft: 2 },
                react_1.default.createElement(ink_1.Text, { color: message.role === 'system' ? 'gray' : 'white' }, message.content))))),
        isLoading && currentStreamMessage && (react_1.default.createElement(ink_1.Box, { marginBottom: 1 },
            react_1.default.createElement(ink_1.Box, null,
                react_1.default.createElement(ink_1.Text, { color: "green", bold: true }, "Claude: ")),
            react_1.default.createElement(ink_1.Box, { marginLeft: 2 },
                react_1.default.createElement(ink_1.Text, { color: "white" }, currentStreamMessage),
                react_1.default.createElement(ink_1.Text, { color: "yellow" }, " \u258A")))),
        isLoading && !currentStreamMessage && (react_1.default.createElement(ink_1.Box, null,
            react_1.default.createElement(ink_1.Text, { color: "yellow" }, "Claude is thinking...")))));
};
exports.MessageList = MessageList;
//# sourceMappingURL=MessageList.js.map