import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import {
  type ToolCallConfirmationDetails,
  ToolConfirmationOutcome
} from '../../../core/permissions/types.js';

interface PermissionDialogProps {
  confirmationDetails: ToolCallConfirmationDetails;
  onComplete: () => void;
}

interface SelectItem {
  label: string;
  value: ToolConfirmationOutcome;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  confirmationDetails,
  onComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelect = async (item: SelectItem) => {
    setIsProcessing(true);
    try {
      await confirmationDetails.onConfirm(item.value);
    } finally {
      onComplete();
    }
  };

  const getOptions = (): SelectItem[] => {
    const options: SelectItem[] = [
      {
        label: 'Yes, allow once',
        value: ToolConfirmationOutcome.ProceedOnce,
      },
    ];

    if (confirmationDetails.type === 'exec' && confirmationDetails.rootCommand) {
      options.push({
        label: `Yes, allow all ${confirmationDetails.rootCommand} commands`,
        value: ToolConfirmationOutcome.ProceedAlwaysPrefix,
      });
    }

    options.push({
      label: 'Yes, allow for this session',
      value: ToolConfirmationOutcome.ProceedAlways,
    });

    options.push({
      label: 'No, cancel (Esc)',
      value: ToolConfirmationOutcome.Cancel,
    });

    return options;
  };

  if (isProcessing) {
    return (
      <Box borderStyle="round" borderColor="yellow" padding={1}>
        <Text color="yellow">Processing...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {confirmationDetails.title}
        </Text>
      </Box>

      {confirmationDetails.type === 'exec' && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="white">{confirmationDetails.command}</Text>
          {confirmationDetails.description && (
            <Text color="gray">{confirmationDetails.description}</Text>
          )}
        </Box>
      )}

      {confirmationDetails.type === 'edit' && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="white">{confirmationDetails.fileName}</Text>
          <Box marginTop={1}>
            <Text color="gray">{confirmationDetails.fileDiff}</Text>
          </Box>
        </Box>
      )}

      {confirmationDetails.type === 'info' && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="white">{confirmationDetails.prompt}</Text>
          {confirmationDetails.urls && confirmationDetails.urls.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">URLs:</Text>
              {confirmationDetails.urls.map((url, i) => (
                <Text key={i} color="gray">
                  {' '}
                  - {url}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>Do you want to proceed?</Text>
      </Box>

      <SelectInput items={getOptions()} onSelect={handleSelect} />
    </Box>
  );
};