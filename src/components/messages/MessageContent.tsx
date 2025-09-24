import React from 'react';
import { Box, Text } from 'ink';
import Markdown from '@inkkit/ink-markdown';
import { DisplayType, type DisplayTypeValue } from '../../constants/ui.js';

interface MessageContentProps {
  content: string;
  displayType?: DisplayTypeValue;
  color?: string;
  prefix?: string;
}

/**
 * Standardized component for rendering message content
 * Supports markdown, plain text, JSON, and error display types
 */
export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  displayType = DisplayType.Text,
  color,
  prefix,
}) => {
  // Content renderers map
  const contentRenderers = {
    [DisplayType.Markdown]: () => <Markdown>{content}</Markdown>,
    [DisplayType.Json]: () => {
      try {
        const formatted = JSON.stringify(JSON.parse(content), null, 2);
        return <Text>{formatted}</Text>;
      } catch {
        return <Text>{content}</Text>;
      }
    },
    [DisplayType.Error]: () => <Text color="red">{content}</Text>,
    [DisplayType.Text]: () => <Text color={color}>{content}</Text>,
  };

  const ContentComponent = contentRenderers[displayType] || contentRenderers[DisplayType.Text];

  return (
    <Box>
      {prefix && (
        <>
          <Text color={color}>{prefix}</Text>
          <Text> </Text>
        </>
      )}
      <ContentComponent />
    </Box>
  );
};