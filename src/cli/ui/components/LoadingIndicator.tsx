import React from 'react';
import { ThinkingAnimation } from '../../../ui/components/ThinkingAnimation.js';
import { useTheme } from '../hooks/useTheme.js';
import { useSettings } from '../contexts/SettingsContext.js';

interface LoadingIndicatorProps {
  text?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  text = 'Thinking...'
}) => {
  const { colors } = useTheme();
  const { settings } = useSettings();

  return (
    <ThinkingAnimation
      size={24}
      label={text}
      labelColor={colors.tool}
      gradColorA={colors.primary}
      gradColorB={colors.tool}
      cycleColors={true}
      runeSet={settings.thinkingAnimationStyle}
    />
  );
};