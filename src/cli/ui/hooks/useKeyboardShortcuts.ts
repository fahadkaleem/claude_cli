/**
 * Hook for handling keyboard shortcuts in the input prompt
 * Manages ESC, double ESC, CMD+Delete and other shortcuts
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useInput, Key } from 'ink';
import { keyMatchers, Command } from '../keyMatchers.js';

export interface UseKeyboardShortcutsProps {
  isActive?: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  onClearInput: () => void;
  onAbort?: () => void;
  onDeleteLine?: () => void;
  onHistoryUp?: () => void;
  onHistoryDown?: () => void;
  onClearScreen?: () => void;
}

export interface UseKeyboardShortcutsReturn {
  escapeCount: number;
  showEscapeHint: boolean;
}

const DOUBLE_ESC_TIMEOUT = 500; // milliseconds

// Helper function to delete the last word from input
const deleteLastWord = (inputValue: string): string => {
  const trimmed = inputValue.trim();
  const words = trimmed.split(/\s+/);

  if (words.length > 0) {
    words.pop();
    const newValue = words.join(' ');
    // Add back trailing space if original had it
    return inputValue.endsWith(' ') && newValue ? newValue + ' ' : newValue;
  }
  return '';
};

export function useKeyboardShortcuts({
  isActive = true,
  inputValue,
  setInputValue,
  onClearInput,
  onAbort,
  onDeleteLine,
  onHistoryUp,
  onHistoryDown,
  onClearScreen,
}: UseKeyboardShortcutsProps): UseKeyboardShortcutsReturn {
  const [escapeCount, setEscapeCount] = useState(0);
  const [showEscapeHint, setShowEscapeHint] = useState(false);
  const escapeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear escape timer on unmount
  useEffect(() => {
    return () => {
      if (escapeTimerRef.current) {
        clearTimeout(escapeTimerRef.current);
      }
    };
  }, []);

  // Reset escape count after timeout
  const resetEscapeCount = useCallback(() => {
    setEscapeCount(0);
    setShowEscapeHint(false);
  }, []);

  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;

    // Handle ESC key
    if (key.escape) {
      if (escapeCount === 0) {
        // First ESC press - abort/interrupt
        if (onAbort) {
          onAbort();
        }

        // Start timer for double ESC detection
        setEscapeCount(1);
        setShowEscapeHint(true);

        if (escapeTimerRef.current) {
          clearTimeout(escapeTimerRef.current);
        }
        escapeTimerRef.current = setTimeout(() => {
          resetEscapeCount();
        }, DOUBLE_ESC_TIMEOUT);
      } else if (escapeCount === 1) {
        // Second ESC press - clear input
        onClearInput();
        resetEscapeCount();

        if (escapeTimerRef.current) {
          clearTimeout(escapeTimerRef.current);
          escapeTimerRef.current = null;
        }
      }
      return;
    }

    // Reset escape count on any other key
    if (escapeCount > 0) {
      resetEscapeCount();
    }

    // Handle CMD+Delete or CMD+Backspace to delete word backward
    if (key.meta && (key.delete || key.backspace)) {
      setInputValue(deleteLastWord(inputValue));
      return;
    }

    // Handle Ctrl+C to clear input
    if (key.ctrl && input === 'c') {
      onClearInput();
      return;
    }

    // Handle Ctrl+U to delete from cursor to beginning
    if (key.ctrl && input === 'u') {
      // For now, just clear the entire input
      // In future, with TextBuffer, we can delete to beginning
      onClearInput();
      return;
    }

    // Handle Ctrl+K to delete from cursor to end
    if (key.ctrl && input === 'k') {
      // For now, just clear the entire input
      // In future, with TextBuffer, we can delete to end
      onClearInput();
      return;
    }

    // Handle Ctrl+L to clear screen
    if (key.ctrl && input === 'l') {
      if (onClearScreen) {
        onClearScreen();
      }
      return;
    }

    // Handle Ctrl+W to delete word backward
    if (key.ctrl && input === 'w') {
      setInputValue(deleteLastWord(inputValue));
      return;
    }

    // History navigation
    if (key.upArrow || (key.ctrl && input === 'p')) {
      if (onHistoryUp) {
        onHistoryUp();
      }
      return;
    }

    if (key.downArrow || (key.ctrl && input === 'n')) {
      if (onHistoryDown) {
        onHistoryDown();
      }
      return;
    }
  });

  return {
    escapeCount,
    showEscapeHint,
  };
}