import { Tool } from '../../core/Tool.js';
import { ToolErrorType, ToolKind, type ToolResult, type ToolContext, type ToolSchema } from '../../core/types.js';
import {
  detectFileEncoding,
  detectLineEndings,
  writeTextContent,
  detectRepoLineEndings,
  addLineNumbers,
} from '../../utils/fileUtils.js';
import { hasWritePermission } from '../../utils/permissions.js';
import { getPatch } from '../../utils/diffUtils.js';
import { existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import { dirname, isAbsolute, resolve, relative } from 'path';

interface WriteToolParams extends Record<string, unknown> {
  file_path: string;
  content: string;
}

const MAX_LINES_FOR_ASSISTANT = 16000;
const TRUNCATED_MESSAGE =
  '<response clipped><NOTE>To save on context only part of this file has been shown to you.</NOTE>';

export class WriteTool extends Tool<WriteToolParams> {
  readonly name = 'Write';
  readonly displayName = 'Write';
  readonly description = `Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the Read tool first to read the file's contents. This tool will fail if you did not read the file first.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.
Input schema: {'type': 'object', 'properties': {'file_path': {'type': 'string', 'description': 'The absolute path to the file to write (must be absolute, not relative)'}, 'content': {'type': 'string', 'description': 'The content to write to the file'}}, 'required': ['file_path', 'content'], 'additionalProperties': False, '$schema': 'http://json-schema.org/draft-07/schema#'}`;
  readonly kind = ToolKind.Other;
  readonly inputSchema: ToolSchema['input_schema'] = {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to write (must be absolute, not relative)',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
    required: ['file_path', 'content'],
  };

  needsPermission(params: WriteToolParams): boolean {
    return !hasWritePermission(params.file_path);
  }

  getPermissionRequest(params: WriteToolParams) {
    const fullFilePath = isAbsolute(params.file_path)
      ? params.file_path
      : resolve(process.cwd(), params.file_path);

    return {
      file_path: fullFilePath,
      content: params.content,
      action: existsSync(fullFilePath) ? ('update' as const) : ('create' as const),
    };
  }

  getRejectionDisplay(params: WriteToolParams) {
    const fullFilePath = isAbsolute(params.file_path)
      ? params.file_path
      : resolve(process.cwd(), params.file_path);
    const oldFileExists = existsSync(fullFilePath);
    const enc = oldFileExists ? detectFileEncoding(fullFilePath) : 'utf-8';
    const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : '';
    const type: 'create' | 'update' = oldFileExists ? 'update' : 'create';

    const patch = getPatch({
      filePath: params.file_path,
      fileContents: oldContent,
      oldStr: oldContent,
      newStr: params.content,
    });

    return {
      fileName: params.file_path,
      originalContent: oldFileExists ? oldContent : null,
      newContent: params.content,
      fileDiff: this.generateUnifiedDiff(patch),
      hunks: patch,
      rejected: true,
      action: type,
    };
  }

  protected async run(
    params: WriteToolParams,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const { file_path, content } = params;
    const cwd = process.cwd();

    try {
      const fullFilePath = isAbsolute(file_path)
        ? file_path
        : resolve(cwd, file_path);

      const dir = dirname(fullFilePath);
      const oldFileExists = existsSync(fullFilePath);
      const enc = oldFileExists ? detectFileEncoding(fullFilePath) : 'utf-8';
      const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : null;

      const endings = oldFileExists
        ? detectLineEndings(fullFilePath)
        : await detectRepoLineEndings(cwd);

      mkdirSync(dir, { recursive: true });
      writeTextContent(fullFilePath, content, enc, endings);

      if (oldContent) {
        const patch = getPatch({
          filePath: file_path,
          fileContents: oldContent,
          oldStr: oldContent,
          newStr: content,
        });

        const numAdditions = patch.reduce(
          (count, hunk) =>
            count + hunk.lines.filter((line) => line.startsWith('+')).length,
          0,
        );
        const numRemovals = patch.reduce(
          (count, hunk) =>
            count + hunk.lines.filter((line) => line.startsWith('-')).length,
          0,
        );

        return {
          llmContent: this.formatUpdateForLLM(file_path, content),
          returnDisplay: {
            fileName: file_path,
            originalContent: oldContent,
            newContent: content,
            fileDiff: this.generateUnifiedDiff(patch),
            diffStat: {
              additions: numAdditions,
              deletions: numRemovals,
              changes: numAdditions + numRemovals,
            },
          },
        };
      }

      const numLines = content.split('\n').length;
      const relativePath = relative(cwd, fullFilePath);
      return {
        llmContent: `File created successfully at: ${file_path}`,
        returnDisplay: `File created successfully at: ${relativePath}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        llmContent: `Error writing file: ${errorMessage}`,
        returnDisplay: `Error writing file: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
          details: error,
        },
      };
    }
  }

  formatParams(params: Record<string, unknown>): string {
    const filePath = params.file_path as string;
    const cwd = process.cwd();
    return relative(cwd, filePath);
  }

  summarizeResult(result: ToolResult): string {
    if (result.error) {
      return `Error: ${result.error.message}`;
    }

    if (typeof result.returnDisplay === 'object' && 'fileName' in result.returnDisplay) {
      return `Updated ${result.returnDisplay.fileName}`;
    }

    return 'File written successfully';
  }

  private formatUpdateForLLM(filePath: string, content: string): string {
    const lines = content.split(/\r?\n/);
    const truncated = lines.length > MAX_LINES_FOR_ASSISTANT;
    const contentToShow = truncated
      ? lines.slice(0, MAX_LINES_FOR_ASSISTANT).join('\n') + TRUNCATED_MESSAGE
      : content;

    return `The file ${filePath} has been updated. Here's the result of running \`cat -n\` on a snippet of the edited file:\n${addLineNumbers({
      content: contentToShow,
      startLine: 1,
    })}`;
  }

  private generateUnifiedDiff(
    hunks: Array<{
      oldStart: number;
      oldLines: number;
      newStart: number;
      newLines: number;
      lines: string[];
    }>,
  ): string {
    return hunks
      .map((hunk) => {
        const header = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
        return [header, ...hunk.lines].join('\n');
      })
      .join('\n\n');
  }
}