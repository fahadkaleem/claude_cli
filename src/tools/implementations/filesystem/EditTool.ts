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
// No file tracking imports needed
import { existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import { dirname, isAbsolute, resolve, relative } from 'path';

interface EditToolParams extends Record<string, unknown> {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

const N_LINES_SNIPPET = 4;

export class EditTool extends Tool<EditToolParams> {
  readonly name = 'Edit';
  readonly displayName = 'Edit';
  readonly description = `Performs exact string replacements in files.

Usage:
- You must use your \`Read\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if \`old_string\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`.
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.
Input schema: {'type': 'object', 'properties': {'file_path': {'type': 'string', 'description': 'The absolute path to the file to modify'}, 'old_string': {'type': 'string', 'description': 'The text to replace'}, 'new_string': {'type': 'string', 'description': 'The text to replace it with (must be different from old_string)'}, 'replace_all': {'type': 'boolean', 'default': False, 'description': 'Replace all occurences of old_string (default false)'}}, 'required': ['file_path', 'old_string', 'new_string'], 'additionalProperties': False, '$schema': 'http://json-schema.org/draft-07/schema#'}`;

  readonly kind = ToolKind.Other;
  readonly inputSchema: ToolSchema['input_schema'] = {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to modify (must be absolute, not relative)',
      },
      old_string: {
        type: 'string',
        description: 'The text to replace (must be unique within the file unless replace_all is true)',
      },
      new_string: {
        type: 'string',
        description: 'The text to replace it with',
      },
      replace_all: {
        type: 'boolean',
        description: 'Replace all occurrences of old_string (default false)',
      },
    },
    required: ['file_path', 'old_string', 'new_string'],
  };

  needsPermission(params: EditToolParams): boolean {
    return !hasWritePermission(params.file_path);
  }

  getPermissionRequest(params: EditToolParams) {
    const fullFilePath = isAbsolute(params.file_path)
      ? params.file_path
      : resolve(process.cwd(), params.file_path);

    const fileExists = existsSync(fullFilePath);

    // Determine the action
    let action: 'create' | 'update';
    if (params.old_string === '' && !fileExists) {
      action = 'create';
    } else {
      action = 'update';
    }

    return {
      file_path: fullFilePath,
      content: params.new_string,
      action,
    };
  }

  getRejectionDisplay(params: EditToolParams) {
    const fullFilePath = isAbsolute(params.file_path)
      ? params.file_path
      : resolve(process.cwd(), params.file_path);

    const oldFileExists = existsSync(fullFilePath);
    const enc = oldFileExists ? detectFileEncoding(fullFilePath) : 'utf-8';
    const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : '';

    // Apply the edit to show what would have happened
    const { newContent } = this.applyEdit(oldContent, params.old_string, params.new_string, params.replace_all || false);

    const patch = getPatch({
      filePath: params.file_path,
      fileContents: oldContent,
      oldStr: params.old_string,
      newStr: params.new_string,
    });

    return {
      fileName: params.file_path,
      originalContent: oldFileExists ? oldContent : null,
      newContent,
      fileDiff: this.generateUnifiedDiff(patch),
      hunks: patch,
      rejected: true,
      action: oldFileExists ? ('update' as const) : ('create' as const),
    };
  }

  protected async run(
    params: EditToolParams,
    context?: ToolContext,
  ): Promise<ToolResult> {
    const { file_path, old_string, new_string, replace_all = false } = params;
    const cwd = process.cwd();

    try {
      const fullFilePath = isAbsolute(file_path)
        ? file_path
        : resolve(cwd, file_path);

      // Validate same strings
      if (old_string === new_string) {
        return {
          llmContent: 'No changes to make: old_string and new_string are exactly the same.',
          returnDisplay: 'No changes to make: old_string and new_string are exactly the same.',
          error: {
            message: 'No changes to make',
            type: ToolErrorType.INVALID_PARAMS,
          },
        };
      }

      const fileExists = existsSync(fullFilePath);

      // Handle file creation (old_string is empty)
      if (old_string === '') {
        if (fileExists) {
          return {
            llmContent: 'Cannot create new file - file already exists.',
            returnDisplay: 'Cannot create new file - file already exists.',
            error: {
              message: 'File already exists',
              type: ToolErrorType.EXECUTION_FAILED,
            },
          };
        }

        return await this.createFile(fullFilePath, new_string, file_path);
      }

      // Handle existing file operations
      if (!fileExists) {
        return {
          llmContent: `File not found: ${file_path}. Cannot apply edit. Use an empty old_string to create a new file.`,
          returnDisplay: `File not found: ${file_path}`,
          error: {
            message: 'File not found',
            type: ToolErrorType.FILE_NOT_FOUND,
          },
        };
      }

      // Read the file content directly when editing
      // No need to track previous read operations

      const enc = detectFileEncoding(fullFilePath);
      const oldContent = readFileSync(fullFilePath, enc);

      // Check if old_string exists in file
      if (!oldContent.includes(old_string)) {
        return {
          llmContent: `String to replace not found in file. Make sure it matches exactly, including whitespace and line breaks.`,
          returnDisplay: `String to replace not found in file.`,
          error: {
            message: 'String not found',
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
      }

      // Check for multiple matches when replace_all is false
      if (!replace_all) {
        const matches = oldContent.split(old_string).length - 1;
        if (matches > 1) {
          return {
            llmContent: `Found ${matches} matches of the string to replace. For safety, this tool only supports replacing exactly one occurrence at a time unless replace_all is true. Add more lines of context to your edit and try again, or set replace_all to true.`,
            returnDisplay: `Found ${matches} matches. Need unique match or set replace_all to true.`,
            error: {
              message: 'Multiple matches found',
              type: ToolErrorType.EXECUTION_FAILED,
            },
          };
        }
      }

      // Apply the edit
      const { newContent, replacementCount } = this.applyEdit(oldContent, old_string, new_string, replace_all);

      // Check if content actually changed
      if (oldContent === newContent) {
        return {
          llmContent: 'No changes to apply. The new content is identical to the current content.',
          returnDisplay: 'No changes to apply.',
          error: {
            message: 'No changes',
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
      }

      // Write the file
      const dir = dirname(fullFilePath);
      mkdirSync(dir, { recursive: true });

      const endings = detectLineEndings(fullFilePath);
      writeTextContent(fullFilePath, newContent, enc, endings);

      // Generate diff
      const patch = getPatch({
        filePath: file_path,
        fileContents: oldContent,
        oldStr: old_string,
        newStr: new_string,
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

      // Get snippet for LLM
      const snippet = this.getSnippet(oldContent, old_string, new_string);

      return {
        llmContent: `The file ${file_path} has been updated. Here's the result of running \`cat -n\` on a snippet of the edited file:\n${addLineNumbers({
          content: snippet.snippet,
          startLine: snippet.startLine,
        })}`,
        returnDisplay: {
          fileName: file_path,
          originalContent: oldContent,
          newContent,
          fileDiff: this.generateUnifiedDiff(patch),
          diffStat: {
            additions: numAdditions,
            deletions: numRemovals,
            changes: numAdditions + numRemovals,
          },
          hunks: patch,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        llmContent: `Error editing file: ${errorMessage}`,
        returnDisplay: `Error editing file: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
          details: error,
        },
      };
    }
  }

  private async createFile(
    fullFilePath: string,
    content: string,
    displayPath: string,
  ): Promise<ToolResult> {
    try {
      const dir = dirname(fullFilePath);
      mkdirSync(dir, { recursive: true });

      const cwd = process.cwd();
      const endings = await detectRepoLineEndings(cwd);
      writeTextContent(fullFilePath, content, 'utf-8', endings);

      const relativePath = relative(cwd, fullFilePath);
      return {
        llmContent: `File created successfully at: ${displayPath}`,
        returnDisplay: `File created successfully at: ${relativePath}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        llmContent: `Error creating file: ${errorMessage}`,
        returnDisplay: `Error creating file: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
          details: error,
        },
      };
    }
  }

  private applyEdit(
    content: string,
    oldStr: string,
    newStr: string,
    replaceAll: boolean,
  ): { newContent: string; replacementCount: number } {
    if (replaceAll) {
      const count = content.split(oldStr).length - 1;
      return {
        newContent: content.split(oldStr).join(newStr),
        replacementCount: count,
      };
    } else {
      const index = content.indexOf(oldStr);
      if (index === -1) {
        return { newContent: content, replacementCount: 0 };
      }
      return {
        newContent: content.substring(0, index) + newStr + content.substring(index + oldStr.length),
        replacementCount: 1,
      };
    }
  }

  private getSnippet(
    initialText: string,
    oldStr: string,
    newStr: string,
  ): { snippet: string; startLine: number } {
    const before = initialText.split(oldStr)[0] ?? '';
    const replacementLine = before.split(/\r?\n/).length - 1;
    const newFileLines = initialText.replace(oldStr, newStr).split(/\r?\n/);

    // Calculate the start and end line numbers for the snippet
    const startLine = Math.max(0, replacementLine - N_LINES_SNIPPET);
    const endLine = replacementLine + N_LINES_SNIPPET + newStr.split(/\r?\n/).length;

    // Get snippet
    const snippetLines = newFileLines.slice(startLine, endLine + 1);
    const snippet = snippetLines.join('\n');

    return { snippet, startLine: startLine + 1 };
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

    return 'File edited successfully';
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