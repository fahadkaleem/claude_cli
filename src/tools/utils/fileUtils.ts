import {
  readFileSync,
  writeFileSync,
  openSync,
  readSync,
  closeSync,
  existsSync,
} from 'fs';

export type LineEndingType = 'CRLF' | 'LF';

export function detectFileEncoding(filePath: string): BufferEncoding {
  const BUFFER_SIZE = 4096;
  const buffer = Buffer.alloc(BUFFER_SIZE);

  let fd: number | undefined = undefined;
  try {
    fd = openSync(filePath, 'r');
    const bytesRead = readSync(fd, buffer, 0, BUFFER_SIZE, 0);

    if (bytesRead >= 2) {
      if (buffer[0] === 0xff && buffer[1] === 0xfe) return 'utf16le';
    }

    if (
      bytesRead >= 3 &&
      buffer[0] === 0xef &&
      buffer[1] === 0xbb &&
      buffer[2] === 0xbf
    ) {
      return 'utf8';
    }

    const isUtf8 = buffer.slice(0, bytesRead).toString('utf8').length > 0;
    return isUtf8 ? 'utf8' : 'ascii';
  } catch (error) {
    console.error(`Error detecting encoding for file ${filePath}:`, error);
    return 'utf8';
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function detectLineEndings(
  filePath: string,
  encoding: BufferEncoding = 'utf8',
): LineEndingType {
  try {
    const buffer = Buffer.alloc(4096);
    const fd = openSync(filePath, 'r');
    const bytesRead = readSync(fd, buffer, 0, 4096, 0);
    closeSync(fd);

    const content = buffer.toString(encoding, 0, bytesRead);
    let crlfCount = 0;
    let lfCount = 0;

    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        if (i > 0 && content[i - 1] === '\r') {
          crlfCount++;
        } else {
          lfCount++;
        }
      }
    }

    return crlfCount > lfCount ? 'CRLF' : 'LF';
  } catch (error) {
    console.error(`Error detecting line endings for file ${filePath}:`, error);
    return 'LF';
  }
}

export function writeTextContent(
  filePath: string,
  content: string,
  encoding: BufferEncoding,
  endings: LineEndingType,
): void {
  let toWrite = content;
  if (endings === 'CRLF') {
    toWrite = content.split('\n').join('\r\n');
  }

  writeFileSync(filePath, toWrite, { encoding, flush: true });
}

export function readTextContent(
  filePath: string,
  offset = 0,
  maxLines?: number,
): { content: string; lineCount: number; totalLines: number } {
  const enc = detectFileEncoding(filePath);
  const content = readFileSync(filePath, enc);
  const lines = content.split(/\r?\n/);

  const toReturn =
    maxLines !== undefined && lines.length - offset > maxLines
      ? lines.slice(offset, offset + maxLines)
      : lines.slice(offset);

  return {
    content: toReturn.join('\n'),
    lineCount: toReturn.length,
    totalLines: lines.length,
  };
}

export function addLineNumbers({
  content,
  startLine,
}: {
  content: string;
  startLine: number;
}): string {
  if (!content) {
    return '';
  }

  return content
    .split(/\r?\n/)
    .map((line, index) => {
      const lineNum = index + startLine;
      const numStr = String(lineNum);

      if (numStr.length >= 6) {
        return `${numStr}\t${line}`;
      }

      const n = numStr.padStart(6, ' ');
      return `${n}\t${line}`;
    })
    .join('\n');
}

export async function detectRepoLineEndings(cwd: string): Promise<LineEndingType> {
  try {
    const sampleFiles = await getSampleFiles(cwd, 15);
    let crlfCount = 0;

    for (const file of sampleFiles) {
      const lineEnding = detectLineEndings(file);
      if (lineEnding === 'CRLF') {
        crlfCount++;
      }
    }

    return crlfCount > 3 ? 'CRLF' : 'LF';
  } catch {
    return 'LF';
  }
}

async function getSampleFiles(cwd: string, limit: number): Promise<string[]> {
  return [];
}