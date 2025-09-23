#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ink_1 = require("ink");
const meow_1 = __importDefault(require("meow"));
const App_1 = require("./components/App");
const cli = (0, meow_1.default)(`
  Usage
    $ claude-chat [options]

  Options
    --model, -m     Model to use (default: claude-3-5-sonnet-20241022)
    --help, -h      Show help
    --version, -v   Show version

  Examples
    $ claude-chat
    $ claude-chat --model claude-3-5-sonnet-20241022

  Controls
    Ctrl+Enter      Send message
    Enter           New line
    Ctrl+L          Clear chat
    Ctrl+C          Exit
`, {
    importMeta: import.meta,
    flags: {
        model: {
            type: 'string',
            shortFlag: 'm',
            default: 'claude-3-5-sonnet-20241022'
        },
        help: {
            type: 'boolean',
            shortFlag: 'h'
        },
        version: {
            type: 'boolean',
            shortFlag: 'v'
        }
    }
});
if (cli.flags.help) {
    cli.showHelp();
    process.exit(0);
}
if (cli.flags.version) {
    cli.showVersion();
    process.exit(0);
}
const { waitUntilExit } = (0, ink_1.render)(react_1.default.createElement(App_1.App, { model: cli.flags.model }));
waitUntilExit().catch(console.error);
//# sourceMappingURL=cli.js.map