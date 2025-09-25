import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { SlashCommand } from '../commands/types.js';

interface SuggestionsDisplayProps {
  suggestions: SlashCommand[];
  selectedIndex: number;
  maxVisible?: number;
}

const MAX_SUGGESTIONS_TO_SHOW = 5;

export const SuggestionsDisplay: React.FC<SuggestionsDisplayProps> = ({
  suggestions,
  selectedIndex,
  maxVisible = MAX_SUGGESTIONS_TO_SHOW
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);

  // Auto-scroll to keep selected item visible
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + maxVisible) {
      setScrollOffset(selectedIndex - maxVisible + 1);
    }
  }, [selectedIndex, maxVisible]);

  if (suggestions.length === 0) {
    return null;
  }

  // Calculate visible slice based on scroll offset
  const visibleSuggestions = suggestions.slice(
    scrollOffset,
    scrollOffset + maxVisible
  );

  // Fixed column width for consistent alignment
  const commandColumnWidth = 30;

  return (
    <Box flexDirection="column">
      {/* Render visible suggestions */}
      {visibleSuggestions.map((command, visualIndex) => {
        const actualIndex = scrollOffset + visualIndex;
        const isActive = actualIndex === selectedIndex;

        // Format command with aliases
        let commandText = `/${command.name}`;
        if (command.aliases && command.aliases.length > 0) {
          commandText += ` (${command.aliases.join(', ')})`;
        }

        return (
          <Box key={command.name} flexDirection="row">
            <Box width={commandColumnWidth}>
              <Text color={isActive ? 'cyan' : 'white'}>
                {commandText}
              </Text>
            </Box>
            <Box flexGrow={1}>
              <Text color={isActive ? 'cyan' : 'gray'} wrap="wrap">
                {command.description}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};