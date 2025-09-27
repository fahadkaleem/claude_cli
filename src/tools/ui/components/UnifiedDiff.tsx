import React from 'react';
import { Box, Text } from 'ink';

interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

interface UnifiedDiffProps {
  patch: Hunk;
  dim?: boolean;
  width: number;
  theme?: DiffTheme;
}

interface DiffTheme {
  addedBackground: string;
  addedDimmedBackground: string;
  removedBackground: string;
  removedDimmedBackground: string;
  lineNumberColor: string;
  textColor?: string;
}

const DEFAULT_THEME: DiffTheme = {
  addedBackground: '#1a4d2e',
  addedDimmedBackground: '#0d261a',
  removedBackground: '#4d1a1a',
  removedDimmedBackground: '#261010',
  lineNumberColor: '#666666',
  textColor: undefined,
};

interface DiffLine {
  code: string;
  lineNumber: number;
  type: 'add' | 'remove' | 'nochange';
}

export const UnifiedDiff: React.FC<UnifiedDiffProps> = ({
  patch,
  dim = false,
  width,
  theme = DEFAULT_THEME,
}) => {
  const diffLines = formatDiffLines(patch.lines, patch.oldStart);
  const maxLineNumber = Math.max(...diffLines.map((line) => line.lineNumber));
  const lineNumberWidth = maxLineNumber.toString().length;

  return (
    <Box flexDirection="column">
      {diffLines.map((line, index) => {
        const wrappedLines = wrapLine(line.code, width - lineNumberWidth);

        return wrappedLines.map((wrappedLine, wrapIndex) => {
          const key = `${line.type}-${line.lineNumber}-${index}-${wrapIndex}`;
          const showLineNumber = wrapIndex === 0;

          return (
            <Box key={key}>
              <LineNumber
                lineNumber={showLineNumber ? line.lineNumber : undefined}
                width={lineNumberWidth}
                color={theme.lineNumberColor}
              />
              <DiffLineContent
                content={wrappedLine}
                type={line.type}
                dim={dim}
                theme={theme}
              />
            </Box>
          );
        });
      })}
    </Box>
  );
};

interface LineNumberProps {
  lineNumber?: number;
  width: number;
  color: string;
}

const LineNumber: React.FC<LineNumberProps> = ({ lineNumber, width, color }) => {
  const display = lineNumber !== undefined
    ? lineNumber.toString().padStart(width)
    : ' '.repeat(width);

  return <Text color={color}>{display} </Text>;
};

interface DiffLineContentProps {
  content: string;
  type: 'add' | 'remove' | 'nochange';
  dim: boolean;
  theme: DiffTheme;
}

const DiffLineContent: React.FC<DiffLineContentProps> = ({
  content,
  type,
  dim,
  theme,
}) => {
  const backgroundColors = {
    add: dim ? theme.addedDimmedBackground : theme.addedBackground,
    remove: dim ? theme.removedDimmedBackground : theme.removedBackground,
    nochange: undefined,
  };

  return (
    <Text
      color={theme.textColor}
      backgroundColor={backgroundColors[type]}
      dimColor={dim}
    >
      {content}
    </Text>
  );
};

function formatDiffLines(lines: string[], startingLineNumber: number): DiffLine[] {
  const result: DiffLine[] = [];
  let currentLine = startingLineNumber;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('+')) {
      result.push({
        code: ' ' + line.slice(1),
        lineNumber: currentLine,
        type: 'add',
      });
      currentLine++;
    } else if (line.startsWith('-')) {
      result.push({
        code: ' ' + line.slice(1),
        lineNumber: currentLine,
        type: 'remove',
      });

      let removedCount = 0;
      while (lines[i + removedCount + 1]?.startsWith('-')) {
        removedCount++;
        currentLine++;
        const removedLine = lines[i + removedCount];
        result.push({
          code: ' ' + removedLine.slice(1),
          lineNumber: currentLine,
          type: 'remove',
        });
      }
      i += removedCount;
      currentLine -= removedCount;
    } else {
      result.push({
        code: line,
        lineNumber: currentLine,
        type: 'nochange',
      });
      currentLine++;
    }
  }

  return result;
}

function wrapLine(text: string, maxWidth: number): string[] {
  if (text.length <= maxWidth) {
    return [text];
  }

  const wrapped: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    wrapped.push(remaining.slice(0, maxWidth));
    remaining = remaining.slice(maxWidth);
  }

  return wrapped;
}