import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from './TextInput.js';
import { SuggestionsDisplay } from './SuggestionsDisplay.js';
import { commandService } from '../../../services/CommandService.js';
import { registerBuiltInCommands } from '../commands/registerCommands.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useDialog } from '../contexts/DialogContext.js';
import { useTheme } from '../hooks/useTheme.js';
import { useTerminalWidth } from '../hooks/useTerminalWidth.js';
import type { SlashCommand } from '../commands/types.js';
import {
  saveClipboardImage,
  cleanupOldClipboardImages,
  formatTextPastePlaceholder,
  formatImagePlaceholder,
  expandTextPastes,
  expandImagePastes,
  toRelativePathIfPossible,
  type ImageData
} from '../utils/clipboardUtils.js';

interface InputPromptProps {
  onSubmit: (value: string) => void;
  onClearChat?: () => void;
  onDisplayLocalMessage?: (message: string) => void;
  onAbortOperation?: () => void;
  isLoading?: boolean;
}

// Initialize commands once
registerBuiltInCommands();

export const InputPrompt: React.FC<InputPromptProps> = ({ onSubmit, onClearChat, onDisplayLocalMessage, onAbortOperation, isLoading = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<SlashCommand[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [cursorOffset, setCursorOffset] = useState(0);
  const [pasteCounter, setPasteCounter] = useState(1);
  const [imageCounter, setImageCounter] = useState(1);
  const [pastedImages, setPastedImages] = useState<Map<number, ImageData>>(new Map());
  const [pastedTexts, setPastedTexts] = useState<Map<number, string>>(new Map());
  const { openDialog } = useDialog();
  const { colors } = useTheme();
  const columns = useTerminalWidth();

  // Use keyboard shortcuts hook
  const { escapeCount, showEscapeHint } = useKeyboardShortcuts({
    isActive: true,
    inputValue,
    setInputValue,
    onClearInput: () => setInputValue(''),
    onAbort: () => {
      if (isLoading) {
        // Abort the current AI operation
        if (onAbortOperation) {
          onAbortOperation();
        }
      }
    },
    onClearScreen: onClearChat,
  });

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
          const newValue = '/' + selected.name + ' ';
          setInputValue(newValue);
          setCursorOffset(newValue.length);
          setSuggestions([]);
        }
        return;
      } else if (key.return) {
        // Enter: execute if no args needed, otherwise fill like Tab
        const selected = suggestions[selectedSuggestionIndex];
        if (selected) {
          if (selected.expectsArgs) {
            // Command expects args, just fill it in
            const newValue = '/' + selected.name + ' ';
            setInputValue(newValue);
            setCursorOffset(newValue.length);
            setSuggestions([]);
          } else {
            // No args needed, execute immediately
            executeCommand(selected, '');
            setInputValue('');
            setSuggestions([]);
          }
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
          } else if (result.type === 'dialog') {
            openDialog(result.dialog);
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

    // Replace placeholders with actual content
    let processedValue = expandTextPastes(value, pastedTexts);
    processedValue = expandImagePastes(processedValue, pastedImages, true);

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
        onSubmit(processedValue.trim());
      }
    } else {
      // Regular message - use processed value with expanded pastes
      onSubmit(processedValue.trim());
    }

    setInputValue('');
    setSuggestions([]);
    // Clear paste data after submit
    setPastedTexts(new Map());
    setPastedImages(new Map());
  };

  const handleInputChange = (value: string) => {
    // Check if the pasted content is an image file path (from Finder drag & drop)
    const imageExtensions = /\.(png|jpg|jpeg|gif|bmp|webp)$/i;

    // Detect if this is a file path paste (contains image extension)
    if (imageExtensions.test(value)) {
      const newPart = value.slice(inputValue.length);

      if (newPart && imageExtensions.test(newPart)) {
        const placeholder = formatImagePlaceholder(imageCounter);
        const filePath = newPart.trim();

        // Store the file path with relative path conversion
        const relativePath = toRelativePathIfPossible(filePath);
        setPastedImages(prev => new Map(prev).set(imageCounter, {
          base64: '',
          filePath: relativePath
        }));

        const newValue = inputValue + placeholder;
        setInputValue(newValue);
        setImageCounter(prev => prev + 1);
        return;
      }
    }

    setInputValue(value);
  };

  const handleTextPaste = (text: string, pasteNumber: number) => {
    const placeholder = formatTextPastePlaceholder(text, pasteNumber);

    // Store the pasted text
    setPastedTexts(prev => new Map(prev).set(pasteNumber, text));

    const newInput = inputValue.slice(0, cursorOffset) + placeholder + inputValue.slice(cursorOffset);
    setInputValue(newInput);
    setCursorOffset(cursorOffset + placeholder.length);
    setPasteCounter(prev => prev + 1);
  };

  const handleImagePaste = async (base64Image: string, imageNumber: number) => {
    const imageData = await saveClipboardImage(base64Image, imageNumber);

    if (imageData) {
      // Successfully saved image
      setPastedImages(prev => new Map(prev).set(imageNumber, imageData));

      // Cleanup old images asynchronously (fire and forget)
      cleanupOldClipboardImages().catch(() => {
        // Ignore cleanup errors
      });
    } else {
      // Failed to save image - could show error to user
      console.error('Failed to save pasted image');
    }

    setImageCounter(prev => prev + 1);
  };

  return (
    <Box flexDirection="column">
      {/* Show escape hint when first ESC is pressed */}
      {showEscapeHint && (
        <Box marginBottom={1}>
          <Text color={colors.warning} dimColor>
            Press ESC again to clear input
          </Text>
        </Box>
      )}

      {/* Input box with rounded corners */}
      <Box borderStyle="round" borderColor={colors.secondary} paddingX={1}>
        <Text color={colors.secondary} bold>{'> '}</Text>
        <TextInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          focus={true}
          columns={columns - 6}
          cursorOffset={cursorOffset}
          onChangeCursorOffset={setCursorOffset}
          disableCursorMovementForUpDownKeys={suggestions.length > 0}
          multiline={false}
          onPaste={handleTextPaste}
          pasteCounter={pasteCounter}
          onImagePaste={handleImagePaste}
          imageCounter={imageCounter}
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