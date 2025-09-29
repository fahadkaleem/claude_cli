#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import { AppContainer } from './cli/ui/AppContainer.js';
import { setOriginalCwd } from './tools/utils/permissions.js';
import { initializeApp } from './core/initializer.js';
import { Config } from './config/Config.js';

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

// Store the original working directory for permission checks
setOriginalCwd(process.cwd());

// Handle --init-prompt flag
if (cli.flags.initPrompt) {
  // Create a temporary config just for initializing the prompt file
  const tempConfig = Config.fromEnvironment();
  tempConfig.initialize()
    .then(() => tempConfig.getPromptService().initializeSystemPromptFile())
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed to initialize system prompt:', error);
      process.exit(1);
    });
} else {
  // Initialize app BEFORE rendering
  // ALL initialization happens here, then we just render
  initializeApp()
    .then(({ config, client }) => {
      const { waitUntilExit } = render(
        <AppContainer
          model={cli.flags.model}
          client={client}
          config={config}
        />
      );
      return waitUntilExit();
    })
    .catch(error => {
      console.error('Fatal initialization error:', error);
      process.exit(1);
    });
}