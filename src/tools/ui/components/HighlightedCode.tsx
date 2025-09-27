import React, { useMemo } from 'react';
import { Text } from 'ink';
import { highlight, supportsLanguage } from 'cli-highlight';

interface HighlightedCodeProps {
  code: string;
  language: string;
}

export const HighlightedCode: React.FC<HighlightedCodeProps> = ({
  code,
  language,
}) => {
  const highlightedCode = useMemo(() => {
    try {
      if (supportsLanguage(language)) {
        return highlight(code, { language });
      }

      return highlight(code, { language: 'markdown' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unknown language')) {
        return highlight(code, { language: 'markdown' });
      }
      return code;
    }
  }, [code, language]);

  return <Text>{highlightedCode}</Text>;
};