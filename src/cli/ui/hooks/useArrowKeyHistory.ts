import { useState, useEffect, useCallback } from 'react';
import { getHistory } from '../../../config/alfredConfig.js';
import type { HistoryEntry } from '../../../config/types.js';

export function useArrowKeyHistory(
  onSetInput: (value: string) => void,
  onRestorePastedContents: (pastedContents: HistoryEntry['pastedContents']) => void,
  currentInput: string,
) {
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [lastTypedInput, setLastTypedInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadHistory() {
      if (isLoading) return;

      setIsLoading(true);
      try {
        const loadedHistory = await getHistory();
        if (!isCancelled) {
          setHistory(loadedHistory);
        }
      } catch (error) {
        console.error('Failed to load command history:', error);
        if (!isCancelled) {
          setHistory([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, []);

  const updateInput = useCallback((entry: HistoryEntry | undefined) => {
    if (entry !== undefined) {
      onSetInput(entry.display);
      onRestorePastedContents(entry.pastedContents);
    }
  }, [onSetInput, onRestorePastedContents]);

  const updateInputString = useCallback((input: string | undefined) => {
    if (input !== undefined) {
      onSetInput(input);
      onRestorePastedContents({});
    }
  }, [onSetInput, onRestorePastedContents]);

  const onHistoryUp = useCallback(() => {
    if (isLoading || history.length === 0) return;

    if (historyIndex === 0 && currentInput.trim() !== '') {
      setLastTypedInput(currentInput);
    }

    if (historyIndex < history.length) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      updateInput(history[historyIndex]);
    }
  }, [isLoading, history, historyIndex, currentInput, updateInput]);

  const onHistoryDown = useCallback(() => {
    if (isLoading || historyIndex === 0) return;

    if (historyIndex === 1) {
      setHistoryIndex(0);
      updateInputString(lastTypedInput);
    } else if (historyIndex > 1) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      updateInput(history[newIndex - 1]);
    }
  }, [isLoading, historyIndex, lastTypedInput, history, updateInput, updateInputString]);

  const resetHistory = useCallback(() => {
    setLastTypedInput('');
    setHistoryIndex(0);
  }, []);

  return {
    historyIndex,
    onHistoryUp,
    onHistoryDown,
    resetHistory,
  };
}