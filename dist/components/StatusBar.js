"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBar = void 0;
const react_1 = __importDefault(require("react"));
const ink_1 = require("ink");
const StatusBar = ({ error, isConnected }) => {
    if (error) {
        return (react_1.default.createElement(ink_1.Box, { borderStyle: "round", borderColor: "red", paddingX: 1, marginY: 1 },
            react_1.default.createElement(ink_1.Text, { color: "red", bold: true }, "Error: "),
            react_1.default.createElement(ink_1.Text, { color: "red" }, error)));
    }
    return (react_1.default.createElement(ink_1.Box, { paddingX: 1 },
        react_1.default.createElement(ink_1.Text, { color: isConnected ? 'green' : 'yellow' }, isConnected ? '● Connected' : '● Connecting...')));
};
exports.StatusBar = StatusBar;
//# sourceMappingURL=StatusBar.js.map