import { structuredPatch } from 'diff';

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

const CONTEXT_LINES = 3;
const AMPERSAND_TOKEN = '<<:AMPERSAND_TOKEN:>>';
const DOLLAR_TOKEN = '<<:DOLLAR_TOKEN:>>';

interface GetPatchOptions {
  filePath: string;
  fileContents: string;
  oldStr: string;
  newStr: string;
}

export function getPatch({
  filePath,
  fileContents,
  oldStr,
  newStr,
}: GetPatchOptions): Hunk[] {
  const escapedOldContent = fileContents
    .replaceAll('&', AMPERSAND_TOKEN)
    .replaceAll('$', DOLLAR_TOKEN);

  const escapedOldStr = oldStr
    .replaceAll('&', AMPERSAND_TOKEN)
    .replaceAll('$', DOLLAR_TOKEN);

  const escapedNewStr = newStr
    .replaceAll('&', AMPERSAND_TOKEN)
    .replaceAll('$', DOLLAR_TOKEN);

  const escapedNewContent = escapedOldContent.replace(
    escapedOldStr,
    escapedNewStr,
  );

  const patch = structuredPatch(
    filePath,
    filePath,
    escapedOldContent,
    escapedNewContent,
    undefined,
    undefined,
    { context: CONTEXT_LINES },
  );

  return patch.hunks.map((hunk) => ({
    ...hunk,
    lines: hunk.lines.map((line) =>
      line
        .replaceAll(AMPERSAND_TOKEN, '&')
        .replaceAll(DOLLAR_TOKEN, '$'),
    ),
  }));
}