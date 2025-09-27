import { readFileSync, statSync } from 'fs';
import { resolve, isAbsolute, extname, relative } from 'path';
import { Tool } from '../../core/Tool.js';
import { ToolKind, ToolErrorType, type ToolResult, type ToolContext } from '../../core/types.js';

// Constants
const MAX_LINES = 2000;
const MAX_LINE_LENGTH = 2000;

// Image handling constants
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
]);

const MAX_WIDTH = 2000;
const MAX_HEIGHT = 2000;
const MAX_IMAGE_SIZE = 3.75 * 1024 * 1024; // 5MB in bytes, accounting for base64 encoding

interface ReadToolParams extends Record<string, unknown> {
  file_path: string;
  offset?: number;
  limit?: number;
}

/**
 * Reads and processes an image file, resizing if necessary
 */
async function readImage(filePath: string, ext: string): Promise<{
  base64: string;
  mediaType: string;
}> {
  try {
    const stats = statSync(filePath);
    const sharp = (await import('sharp')).default;
    const image = sharp(readFileSync(filePath));
    const metadata = await image.metadata();

    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Check if the original file is already within limits
    if (
      stats.size <= MAX_IMAGE_SIZE &&
      width <= MAX_WIDTH &&
      height <= MAX_HEIGHT
    ) {
      // Normalize media type (jpg -> jpeg)
      const normalizedExt = ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1);
      return {
        base64: readFileSync(filePath).toString('base64'),
        mediaType: `image/${normalizedExt}`,
      };
    }

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;

    if (newWidth > MAX_WIDTH) {
      newHeight = Math.round((newHeight * MAX_WIDTH) / newWidth);
      newWidth = MAX_WIDTH;
    }

    if (newHeight > MAX_HEIGHT) {
      newWidth = Math.round((newWidth * MAX_HEIGHT) / newHeight);
      newHeight = MAX_HEIGHT;
    }

    // Resize image
    const resizedImageBuffer = await image
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // If still too large after resize, compress quality
    if (resizedImageBuffer.length > MAX_IMAGE_SIZE) {
      const compressedBuffer = await image.jpeg({ quality: 80 }).toBuffer();
      return {
        base64: compressedBuffer.toString('base64'),
        mediaType: 'image/jpeg',
      };
    }

    // Normalize media type (jpg -> jpeg)
    const normalizedExt = ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1);
    return {
      base64: resizedImageBuffer.toString('base64'),
      mediaType: `image/${normalizedExt}`,
    };
  } catch (error) {
    console.error('Error processing image:', error);
    // Fallback to original image
    const normalizedExt = ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1);
    return {
      base64: readFileSync(filePath).toString('base64'),
      mediaType: `image/${normalizedExt}`,
    };
  }
}

/**
 * Tool for reading file contents with line numbers and truncation support.
 * Handles large files by allowing pagination through offset/limit parameters.
 */
export class ReadTool extends Tool<ReadToolParams> {
  readonly name = 'read_file';
  readonly displayName = 'Read';
  readonly description = `Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than 2000 characters will be truncated
- Results are returned using cat -n format, with line numbers starting at 1
- This tool allows Alfred to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as Alfred is a multimodal LLM.
- This tool can read PDF files (.pdf). PDFs are processed page by page, extracting both text and visual content for analysis.
- This tool can read Jupyter notebooks (.ipynb files) and returns all cells with their outputs, combining code, text, and visualizations.
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful.
- You will regularly be asked to read screenshots. If the user provides a path to a screenshot ALWAYS use this tool to view the file at the path. This tool will work with all temporary file paths like /var/folders/123/abc/T/TemporaryItems/NSIRD_screencaptureui_ZfB1tD/Screenshot.png
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.
Input schema: {'type': 'object', 'properties': {'file_path': {'type': 'string', 'description': 'The absolute path to the file to read'}, 'offset': {'type': 'number', 'description': 'The line number to start reading from. Only provide if the file is too large to read at once'}, 'limit': {'type': 'number', 'description': 'The number of lines to read. Only provide if the file is too large to read at once.'}}, 'required': ['file_path'], 'additionalProperties': False, '$schema': 'http://json-schema.org/draft-07/schema#'}`;

  readonly kind = ToolKind.Other;

  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to read',
      },
      offset: {
        type: 'number',
        description: 'The line number to start reading from. Only provide if the file is too large to read at once',
      },
      limit: {
        type: 'number',
        description: 'The number of lines to read. Only provide if the file is too large to read at once.',
      },
    },
    required: ['file_path'],
    additionalProperties: false,
    $schema: 'http://json-schema.org/draft-07/schema#',
  };

  formatParams(params: ReadToolParams): string {
    const { file_path, offset, limit } = params;
    const cwd = process.cwd();
    const fullPath = isAbsolute(file_path) ? file_path : resolve(cwd, file_path);
    const relativePath = relative(cwd, fullPath);

    if (offset !== undefined || limit !== undefined) {
      const parts = [relativePath];
      if (offset !== undefined) parts.push(`from line ${offset}`);
      if (limit !== undefined) parts.push(`${limit} lines`);
      return parts.join(', ');
    }
    return relativePath;
  }

  summarizeResult(result: ToolResult): string {
    if (result.error) {
      return `Failed: ${result.error.message}`;
    }
    // Extract line count from the content if available
    const content = typeof result.returnDisplay === 'string' ? result.returnDisplay : '';
    const lines = content.split('\n');
    if (lines.length > 1) {
      return `Read ${lines.length} lines`;
    }
    return 'File read successfully';
  }

  protected validateToolParamValues(params: ReadToolParams): string | null {
    const baseValidation = super.validate(params);
    if (baseValidation) return baseValidation;

    const { file_path, offset, limit } = params;

    // Check if path is absolute
    if (!isAbsolute(file_path)) {
      return `File path must be absolute, but got relative path: ${file_path}`;
    }

    // Validate offset
    if (offset !== undefined) {
      if (typeof offset !== 'number' || offset < 0) {
        return 'Offset must be a non-negative number';
      }
      if (!Number.isInteger(offset)) {
        return 'Offset must be an integer';
      }
    }

    // Validate limit
    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit <= 0) {
        return 'Limit must be a positive number';
      }
      if (!Number.isInteger(limit)) {
        return 'Limit must be an integer';
      }
    }

    return null;
  }

  /**
   * Alias for validateToolParamValues to maintain Tool base class compatibility
   */
  validate(params: ReadToolParams): string | null {
    return this.validateToolParamValues(params);
  }

  protected async run(params: ReadToolParams, context?: ToolContext): Promise<ToolResult> {
    const { file_path, offset = 0, limit = MAX_LINES } = params;

    try {
      // Resolve the absolute path
      const absolutePath = resolve(file_path);

      // Show progress
      context?.onProgress?.(`Reading ${absolutePath}...`);

      // Check if it's an image file
      const ext = extname(absolutePath).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        const imageData = await readImage(absolutePath, ext);

        return {
          llmContent: `Successfully read image: ${file_path}. Image data processed and available for display.`,
          returnDisplay: `Read image`,
        };
      }

      // Read the file as text
      const content = readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n');
      const totalLines = lines.length;

      // Apply offset and limit
      const effectiveLimit = Math.min(limit, MAX_LINES);
      const startLine = offset;
      const endLine = Math.min(startLine + effectiveLimit, totalLines);

      // Check if we need to truncate
      const isTruncated = endLine < totalLines || effectiveLimit < limit;

      // Select the lines to return
      const selectedLines = lines.slice(startLine, endLine);

      // Truncate long lines and add line numbers
      const formattedLines = selectedLines.map((line, index) => {
        const lineNum = startLine + index + 1;
        const truncatedLine = line.length > MAX_LINE_LENGTH
          ? line.substring(0, MAX_LINE_LENGTH) + '... [line truncated]'
          : line;
        return `${lineNum.toString().padStart(6)}→${truncatedLine}`;
      });

      const formattedContent = formattedLines.join('\n');

      // Prepare the display content
      let displayContent = formattedContent;

      if (isTruncated) {
        const nextOffset = endLine;
        const remainingLines = totalLines - endLine;

        displayContent = `## File: ${file_path}

**TRUNCATED**: Showing lines ${startLine + 1}-${endLine} of ${totalLines} total lines.
To read more, use: offset=${nextOffset}, limit=${Math.min(remainingLines, MAX_LINES)}

\`\`\`
${formattedContent}
\`\`\``;
      } else if (startLine > 0) {
        displayContent = `## File: ${file_path}

Showing lines ${startLine + 1}-${endLine} of ${totalLines} total lines.

\`\`\`
${formattedContent}
\`\`\``;
      } else {
        displayContent = `## File: ${file_path}

\`\`\`
${formattedContent}
\`\`\``;
      }

      const linesShown = endLine - startLine;
      const summaryText = `Read **${linesShown}** line${linesShown !== 1 ? 's' : ''}`;

      return {
        llmContent: displayContent,
        returnDisplay: summaryText,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle common errors
      if (errorMessage.includes('ENOENT')) {
        return {
          llmContent: `Error: File does not exist: ${file_path}`,
          returnDisplay: `File does not exist: ${file_path}`,
          error: {
            message: `File does not exist: ${file_path}`,
            type: ToolErrorType.FILE_NOT_FOUND,
            details: error,
          },
        };
      }

      if (errorMessage.includes('EISDIR')) {
        return {
          llmContent: `Error: Cannot read directory. Use Bash tool with 'ls' command to list directory contents: ${file_path}`,
          returnDisplay: `Cannot read directory. Use Bash tool with 'ls' command to list directory contents: ${file_path}`,
          error: {
            message: `Cannot read directory. Use Bash tool with 'ls' command to list directory contents: ${file_path}`,
            type: ToolErrorType.INVALID_PARAMS,
            details: error,
          },
        };
      }

      if (errorMessage.includes('EACCES')) {
        return {
          llmContent: `Error: Permission denied: ${file_path}`,
          returnDisplay: `Permission denied: ${file_path}`,
          error: {
            message: `Permission denied: ${file_path}`,
            type: ToolErrorType.PERMISSION_DENIED,
            details: error,
          },
        };
      }

      // Generic error
      return {
        llmContent: `Error: Failed to read file: ${errorMessage}`,
        returnDisplay: `Failed to read file: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
          details: error,
        },
      };
    }
  }
}