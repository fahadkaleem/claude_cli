import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { SuggestionsDisplay } from './SuggestionsDisplay.js';
import { commandService } from '../../services/CommandService.js';
import { registerBuiltInCommands } from '../commands/registerCommands.js';
import type { SlashCommand } from '../commands/types.js';

interface InputPromptProps {
  onSubmit: (value: string) => void;
  onClearChat?: () => void;
  onDisplayLocalMessage?: (message: string) => void;
}

// Initialize commands once
registerBuiltInCommands();

export const InputPrompt: React.FC<InputPromptProps> = ({ onSubmit, onClearChat, onDisplayLocalMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<SlashCommand[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  // Update suggestions when input changes
  useEffect(() => {
    if (inputValue.startsWith('/')) {
      const commandSuggestions = commandService.getSuggestions(inputValue);
      setSuggestions(commandSuggestions);
      setSelectedSuggestionIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [inputValue]);

  // Handle keyboard navigation for suggestions
  useInput((input, key) => {

    // Handle suggestions navigation
    if (suggestions.length > 0) {
      if (key.upArrow) {
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      } else if (key.downArrow) {
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      } else if (key.tab) {
        // Tab accepts the suggestion and puts it in the input field
        const selected = suggestions[selectedSuggestionIndex];
        if (selected) {
          setInputValue('/' + selected.name + ' ');
          setSuggestions([]);
        }
        return;
      }
    }
  });

  // Create command execution context
  const createCommandContext = () => ({
    addMessage: (role: 'user' | 'assistant' | 'system', content: string) => {
      console.log(`[${role}] ${content}`);
    },
    clearChat: () => {
      if (onClearChat) {
        onClearChat();
      }
    },
    sendToAI: (message: string) => {
      onSubmit(message);
    }
  });

  // Execute a command with given context and arguments
  const executeCommand = async (command: SlashCommand, args: string = '') => {
    if (command.action) {
      try {
        const context = createCommandContext();
        const result = await command.action(context, args);

        // Handle command result
        if (result) {
          if (result.type === 'message') {
            // For local commands like /tasks, we don't send to AI
            // We'll handle display differently
            if (onDisplayLocalMessage) {
              onDisplayLocalMessage(result.content);
            }
          } else if (result.type === 'prompt') {
            onSubmit(result.content);
          }
        }
      } catch (error) {
        // Display error message to user
        const errorMessage = error instanceof Error
          ? `Command error: ${error.message}`
          : 'An unexpected error occurred while executing the command';

        if (onDisplayLocalMessage) {
          onDisplayLocalMessage(errorMessage);
        }
        console.error('Command execution error:', error);
      }
    }
  };

  // Handle submit on Enter key
  const handleSubmit = (value: string) => {

    // Don't submit empty messages
    if (!value.trim()) return;

    // Special case: Handle "exit" and "quit" as /exit command
    const trimmedValue = value.trim().toLowerCase();
    if (trimmedValue === 'exit' || trimmedValue === 'quit') {
      process.exit(0);
      return;
    }

    // Case 1: If it's a perfect match command, execute it immediately
    if (commandService.isPerfectMatch(value)) {
      const { command, args } = commandService.parseCommand(value);
      if (command) {
        executeCommand(command, args);
        setInputValue('');
        setSuggestions([]);
        return;
      }
    }

    // Case 2: If suggestions are visible, execute the selected command
    if (suggestions.length > 0 && value.startsWith('/')) {
      const selected = suggestions[selectedSuggestionIndex];
      if (selected) {
        executeCommand(selected);
        setInputValue('');
        setSuggestions([]);
        return;
      }
    }

    // Case 3: Handle regular command or message
    if (value.startsWith('/')) {
      const { command, args } = commandService.parseCommand(value);
      if (command) {
        executeCommand(command, args);
      } else {
        // Unknown command - send as regular message
        onSubmit(value.trim());
      }
    } else {
      // Regular message
      onSubmit(value.trim());
    }

    setInputValue('');
    setSuggestions([]);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  return (
    <Box flexDirection="column">
      {/* Input box with rounded corners */}
      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray" bold>{'> '}</Text>
        <TextInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          focus={true}
        />
      </Box>

      {/* Show suggestions below the input */}
      {suggestions.length > 0 && (
        <SuggestionsDisplay
          suggestions={suggestions}
          selectedIndex={selectedSuggestionIndex}
        />
      )}
    </Box>
  );
};