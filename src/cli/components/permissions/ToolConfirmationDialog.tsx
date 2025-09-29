import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { ToolCallConfirmationDetails, ToolConfirmationOutcome } from '../../../core/permissions/types.js';
import { useTheme } from '../../ui/hooks/useTheme.js';

interface ToolConfirmationDialogProps {
  details: ToolCallConfirmationDetails;
  onRespond: (outcome: ToolConfirmationOutcome) => void;
}

export const ToolConfirmationDialog: React.FC<ToolConfirmationDialogProps> = ({
  details,
  onRespond,
}) => {
  const { colors } = useTheme();

  // Safety check for undefined details
  if (!details) {
    return (
      <Box borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">Error: No confirmation details provided</Text>
      </Box>
    );
  }

  const items = [
    { label: 'Yes, allow once', value: 'proceed-once' },
    { label: 'Yes, allow always for this session', value: 'proceed-always' },
    { label: 'No, cancel (esc)', value: 'cancel' },
  ];

  const handleSelect = (item: { label: string; value: string }) => {
    switch (item.value) {
      case 'proceed-once':
        onRespond(ToolConfirmationOutcome.ProceedOnce);
        break;
      case 'proceed-always':
        onRespond(ToolConfirmationOutcome.ProceedAlways);
        break;
      case 'cancel':
        onRespond(ToolConfirmationOutcome.Cancel);
        break;
    }
  };

  // Determine what to display based on the type
  let title = 'Confirm Action';
  let bodyContent: React.ReactNode;

  if (details.type === 'exec') {
    title = 'Confirm Shell Command';
    bodyContent = (
      <Box flexDirection="column">
        <Text>{details.command}</Text>
        {details.description && (
          <Text color={colors.secondary}>{details.description}</Text>
        )}
        {details.rootCommand && (
          <Box marginTop={1}>
            <Text color={colors.secondary}>
              Command: {details.rootCommand}
            </Text>
          </Box>
        )}
      </Box>
    );
  } else if (details.type === 'edit') {
    title = 'Confirm File Edit';
    bodyContent = (
      <Box flexDirection="column">
        <Text>File: {details.fileName}</Text>
        {details.fileDiff && (
          <Box marginTop={1}>
            <Text color={colors.secondary}>Changes to be made:</Text>
            <Text>{details.fileDiff.slice(0, 200)}...</Text>
          </Box>
        )}
      </Box>
    );
  } else if (details.type === 'info') {
    title = 'Confirm Information Request';
    bodyContent = (
      <Box flexDirection="column">
        <Text>{details.prompt}</Text>
        {details.urls && details.urls.length > 0 && (
          <Box marginTop={1}>
            <Text color={colors.secondary}>URLs to fetch:</Text>
            {details.urls.map((url, i) => (
              <Text key={i}> - {url}</Text>
            ))}
          </Box>
        )}
      </Box>
    );
  } else {
    // Generic fallback for other types
    bodyContent = (
      <Box flexDirection="column">
        <Text>Perform action?</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.primary} paddingX={1}>
      <Text bold color={colors.primary}>
        {title}
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {bodyContent}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text>Do you want to proceed?</Text>
      </Box>

      <Box paddingTop={1} paddingBottom={1}>
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
};