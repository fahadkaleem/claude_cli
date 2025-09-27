import React from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { basename, relative } from 'path';
import { existsSync, readFileSync } from 'fs';
import { UnifiedDiff } from '../../../tools/ui/components/UnifiedDiff.js';
import { HighlightedCode } from '../../../tools/ui/components/HighlightedCode.js';
import { getPatch } from '../../../tools/utils/diffUtils.js';
import { detectFileEncoding } from '../../../tools/utils/fileUtils.js';
import { useTheme } from '../hooks/useTheme.js';
import type { PermissionRequestData } from '../../../tools/core/types.js';

interface PermissionDialogProps {
  data: PermissionRequestData;
  onApprove: (permanent: boolean) => void;
  onReject: () => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  data,
  onApprove,
  onReject,
}) => {
  const { colors } = useTheme();

  const items = [
    { label: '1. Yes', value: 'yes' },
    { label: '2. Yes, allow all edits during this session (shift+tab)', value: 'yes-permanent' },
    { label: '3. No, and tell Claude what to do differently (esc)', value: 'no' },
  ];

  const handleSelect = (item: { label: string; value: string }) => {
    switch (item.value) {
      case 'yes':
        onApprove(false);
        break;
      case 'yes-permanent':
        onApprove(true);
        break;
      case 'no':
        onReject();
        break;
    }
  };

  const cwd = process.cwd();
  const terminalWidth = process.stdout.columns || 80;

  if (!data.file_path) {
    return null;
  }

  const fileExists = existsSync(data.file_path);
  const fileName = basename(data.file_path);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.primary} paddingX={1}>
      <Text bold color={colors.primary}>
        {data.action === 'create' ? `Create ${fileName}` : `Overwrite ${fileName}`}
      </Text>

      <Box flexDirection="column">
        {fileExists && data.content ? (
          <FileUpdatePreview
            filePath={data.file_path}
            newContent={data.content}
            width={terminalWidth - 6}
          />
        ) : (
          <FileCreatePreview
            filePath={data.file_path}
            content={data.content || ''}
            width={terminalWidth - 6}
          />
        )}
      </Box>

      <Box flexDirection="column">
        <Text>
          Do you want to {data.action === 'create' ? 'create' : 'overwrite'} <Text bold>{fileName}</Text>?
        </Text>
      </Box>

      <Box paddingTop={1} paddingBottom={1}>
        <SelectInput
          items={items}
          onSelect={handleSelect}
        />
      </Box>
    </Box>
  );
};

interface FileUpdatePreviewProps {
  filePath: string;
  newContent: string;
  width: number;
}

const FileUpdatePreview: React.FC<FileUpdatePreviewProps> = ({
  filePath,
  newContent,
  width,
}) => {
  const { colors } = useTheme();
  const enc = detectFileEncoding(filePath);
  const oldContent = readFileSync(filePath, enc);
  const patch = getPatch({
    filePath,
    fileContents: oldContent,
    oldStr: oldContent,
    newStr: newContent,
  });

  const cwd = process.cwd();
  const displayPath = relative(cwd, filePath);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        {patch.map((hunk, index) => (
          <Box key={index} marginBottom={index < patch.length - 1 ? 1 : 0}>
            <UnifiedDiff patch={hunk} width={width - 4} dim={false} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

interface FileCreatePreviewProps {
  filePath: string;
  content: string;
  width: number;
}

const FileCreatePreview: React.FC<FileCreatePreviewProps> = ({
  filePath,
  content,
  width,
}) => {
  const { colors } = useTheme();
  const cwd = process.cwd();
  const displayPath = relative(cwd, filePath);
  const ext = filePath.split('.').pop() || 'txt';

  const lines = content.split('\n');
  const preview = lines.slice(0, 20);
  const hasMore = lines.length > 20;

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        {preview.map((line, idx) => (
          <Box key={idx}>
            <Text color={colors.secondary}>{String(idx + 1).padStart(String(preview.length).length, ' ')} </Text>
            <HighlightedCode code={line} language={ext} />
          </Box>
        ))}
        {hasMore && (
          <Text color={colors.secondary}>
            ... (+{lines.length - 20} more lines)
          </Text>
        )}
      </Box>
    </Box>
  );
};