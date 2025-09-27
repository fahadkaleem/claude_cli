import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { ToolCallConfirmationDetails, ToolConfirmationOutcome } from '../../../core/permissions/types.js';
import { useTheme } from '../../ui/hooks/useTheme.js';

interface BashConfirmationDialogProps {
  details: ToolCallConfirmationDetails;
  onRespond: (outcome: ToolConfirmationOutcome) => void;
}

export const BashConfirmationDialog: React.FC<BashConfirmationDialogProps> = ({
  details,
  onRespond,
}) => {
  const { colors } = useTheme();
  const command = details.type === 'exec' ? details.command : '';
  const rootCommand = details.type === 'exec' ? details.rootCommand : '';
  const cwd = process.cwd();

  const items = [
    { label: '1. Yes, allow once', value: 'yes' },
  ];

  if (rootCommand) {
    items.push({
      label: `2. Yes, allow all "${rootCommand}" commands`,
      value: 'yes-prefix',
    });
  }

  items.push({
    label: `${rootCommand ? '3' : '2'}. No, cancel (esc)`,
    value: 'no',
  });

  const handleSelect = (item: { label: string; value: string }) => {
    switch (item.value) {
      case 'yes':
        onRespond(ToolConfirmationOutcome.ProceedOnce);
        break;
      case 'yes-prefix':
        onRespond(ToolConfirmationOutcome.ProceedAlwaysPrefix);
        break;
      case 'no':
        onRespond(ToolConfirmationOutcome.Cancel);
        break;
    }
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.primary} paddingX={1}>
      <Text bold color={colors.primary}>
        Bash command
      </Text>

      <Box flexDirection="column" marginTop={1}>
        <Text>{command}</Text>
        {details.type === 'exec' && details.description && (
          <Text color={colors.secondary}>{details.description}</Text>
        )}
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