import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { SlashCommand } from '../commands/types.js';
import { useTheme } from '../hooks/useTheme.js';
import { useTerminalWidth } from '../hooks/useTerminalWidth.js';

interface SuggestionsDisplayProps {
  suggestions: SlashCommand[];
  selectedIndex: number;
  maxVisible?: number;
}

const MAX_SUGGESTIONS_TO_SHOW = 10;

export const SuggestionsDisplay: React.FC<SuggestionsDisplayProps> = ({
  suggestions,
  selectedIndex,
  maxVisible = MAX_SUGGESTIONS_TO_SHOW
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const { colors } = useTheme();
  const columns = useTerminalWidth();

  // Reset scroll offset when suggestions change
  useEffect(() => {
    setScrollOffset(0);
  }, [suggestions]);

  // Auto-scroll to keep selected item visible
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + maxVisible) {
      setScrollOffset(selectedIndex - maxVisible + 1);
    }
  }, [selectedIndex, maxVisible, scrollOffset]);

  if (suggestions.length === 0) {
    return null;
  }

  // Calculate visible slice based on scroll offset
  const visibleSuggestions = suggestions.slice(
    scrollOffset,
    scrollOffset + maxVisible
  );

  // Dynamic column width based on terminal size
  const commandColumnWidth = Math.max(
    ...suggestions.map(cmd => {
      const aliasText = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
      return cmd.name.length + aliasText.length + 1; // +1 for the /
    }),
    20
  ) + 2;

  return (
    <Box flexDirection="column" paddingX={2} paddingY={0}>
      {visibleSuggestions.map((command, visualIndex) => {
        const actualIndex = scrollOffset + visualIndex;
        const isSelected = actualIndex === selectedIndex;

        return (
          <Box
            key={command.name}
            flexDirection={columns < 80 ? 'column' : 'row'}
          >
            <Box width={columns < 80 ? undefined : commandColumnWidth}>
              <Text
                color={isSelected ? colors.primary : undefined}
                dimColor={!isSelected}
              >
                /{command.name}
                {command.aliases && command.aliases.length > 0 && (
                  <Text dimColor> ({command.aliases.join(', ')})</Text>
                )}
              </Text>
            </Box>
            <Box
              width={columns < 80 ? undefined : columns - commandColumnWidth - 4}
              paddingLeft={columns < 80 ? 4 : 0}
            >
              <Text
                color={isSelected ? colors.primary : undefined}
                dimColor={!isSelected}
                wrap="wrap"
              >
                {command.description}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};