#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import { App } from './components/core/App.js';
import { promptService } from './services/PromptService.js';

const cli = meow(`
  Usage
    $ alfred [options]

  Options
    --model, -m        Model to use (default: claude-sonnet-4-20250514)
    --init-prompt      Initialize system prompt file for customization
    --help, -h         Show help
    --version, -v      Show version

  Examples
    $ alfred
    $ alfred --model claude-sonnet-4-20250514
    $ alfred --init-prompt

  Controls
    Enter           Send message
    Ctrl+C          Exit

  Customization
    System prompt can be customized at ~/.alfred/system.md
    Or set ALFRED_SYSTEM_MD env var to use a different path
`, {
  importMeta: import.meta,
  flags: {
    model: {
      type: 'string',
      shortFlag: 'm',
      default: 'claude-sonnet-4-20250514'
    },
    initPrompt: {
      type: 'boolean',
      default: false
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

// Handle --init-prompt flag
if (cli.flags.initPrompt) {
  promptService.initializeSystemPromptFile()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed to initialize system prompt:', error);
      process.exit(1);
    });
} else {
  const { waitUntilExit } = render(<App model={cli.flags.model} />);
  waitUntilExit().catch(console.error);
}