import { useState, useEffect, useCallback } from 'react';
import { ShellHistoryService } from '../../../core/services/shellHistoryService.js';

export interface UseShellHistoryReturn {
  history: string[];
  addCommandToHistory: (command: string) => void;
  getPreviousCommand: () => string | null;
  getNextCommand: () => string | null;
  resetHistoryPosition: () => void;
}

export function useShellHistory(): UseShellHistoryReturn {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    async function loadHistory() {
      try {
        const loadedHistory = await ShellHistoryService.readHistory();
        setHistory(loadedHistory.reverse());
      } catch (error) {
        setHistory([]);
      }
    }
    loadHistory();
  }, []);

  const addCommandToHistory = useCallback(
    async (command: string) => {
      if (!command.trim()) {
        return;
      }
      try {
        const newHistory = await ShellHistoryService.addCommand(command, history);
        setHistory(newHistory);
        setHistoryIndex(-1);
      } catch (error) {

      }
    },
    [history],
  );

  const getPreviousCommand = useCallback(() => {
    if (history.length === 0) {
      return null;
    }
    const newIndex = Math.min(historyIndex + 1, history.length - 1);
    setHistoryIndex(newIndex);
    return history[newIndex] ?? null;
  }, [history, historyIndex]);

  const getNextCommand = useCallback(() => {
    if (historyIndex < 0) {
      return null;
    }
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    return newIndex >= 0 ? history[newIndex] : '';
  }, [history, historyIndex]);

  const resetHistoryPosition = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  return {
    history,
    addCommandToHistory,
    getPreviousCommand,
    getNextCommand,
    resetHistoryPosition,
  };
}