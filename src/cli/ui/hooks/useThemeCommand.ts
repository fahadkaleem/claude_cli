import { useState, useCallback } from 'react';
import type { ThemePreset } from '../types.js';

interface UseThemeCommandReturn {
  currentTheme: ThemePreset;
  setCurrentTheme: (theme: ThemePreset) => void;
  handleThemeSelect: (theme: ThemePreset) => void;
}

export const useThemeCommand = (
  onThemeChange?: (theme: ThemePreset) => void
): UseThemeCommandReturn => {
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>('tokyo-night');

  const handleThemeSelect = useCallback((theme: ThemePreset) => {
    setCurrentTheme(theme);
    onThemeChange?.(theme);
  }, [onThemeChange]);

  return {
    currentTheme,
    setCurrentTheme,
    handleThemeSelect,
  };
};