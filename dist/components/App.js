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
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const react_1 = __importStar(require("react"));
const ink_1 = require("ink");
const Header_1 = require("./Header");
const MessageList_1 = require("./MessageList");
const ChatInput_1 = require("./ChatInput");
const StatusBar_1 = require("./StatusBar");
const useChat_1 = require("../hooks/useChat");
const anthropic_1 = require("../services/anthropic");
const App = ({ model }) => {
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const { messages, isLoading, error, currentStreamMessage, sendMessage, clearError, clearChat } = (0, useChat_1.useChat)();
    (0, react_1.useEffect)(() => {
        try {
            (0, anthropic_1.initializeClient)();
            setIsConnected(true);
        }
        catch (err) {
            setIsConnected(false);
        }
    }, []);
    (0, ink_1.useInput)((input, key) => {
        if (key.ctrl && input === 'l') {
            clearChat();
        }
        if (key.escape && error) {
            clearError();
        }
    });
    return (react_1.default.createElement(ink_1.Box, { flexDirection: "column", paddingX: 1, paddingY: 1 },
        react_1.default.createElement(Header_1.Header, { model: model }),
        react_1.default.createElement(ink_1.Box, { flexDirection: "column", flexGrow: 1 },
            react_1.default.createElement(MessageList_1.MessageList, { messages: messages, currentStreamMessage: currentStreamMessage, isLoading: isLoading })),
        error && react_1.default.createElement(StatusBar_1.StatusBar, { error: error, isConnected: isConnected }),
        react_1.default.createElement(ChatInput_1.ChatInput, { onSubmit: sendMessage, isDisabled: isLoading }),
        !error && (react_1.default.createElement(ink_1.Box, { marginTop: 1 },
            react_1.default.createElement(StatusBar_1.StatusBar, { error: null, isConnected: isConnected })))));
};
exports.App = App;
//# sourceMappingURL=App.js.map