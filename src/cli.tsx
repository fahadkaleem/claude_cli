#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import { App } from './components/core/App.js';

const cli = meow(`
  Usage
    $ claude-chat [options]

  Options
    --model, -m     Model to use (default: claude-sonnet-4-20250514)
    --help, -h      Show help
    --version, -v   Show version

  Examples
    $ claude-chat
    $ claude-chat --model claude-sonnet-4-20250514

  Controls
    Enter           Send message
    Ctrl+C          Exit
`, {
  importMeta: import.meta,
  flags: {
    model: {
      type: 'string',
      shortFlag: 'm',
      default: 'claude-sonnet-4-20250514'
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

const { waitUntilExit } = render(<App model={cli.flags.model} />);

waitUntilExit().catch(console.error);