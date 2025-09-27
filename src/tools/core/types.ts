// JSON Schema property definition
export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, JsonSchemaProperty>;
    required?: string[];
  };
}

export interface ToolError {
  message: string;
  type: ToolErrorType;
  details?: unknown;
}

export interface ToolResult {
  /**
   * Content meant to be included in LLM history.
   * This represents the factual outcome of the tool execution.
   */
  llmContent: string;

  /**
   * Display content for user UI.
   * Can be a simple string (markdown/text) or a rich object (FileDiff, AnsiOutput, etc.)
   */
  returnDisplay: ToolResultDisplay;

  /**
   * If present, the tool call is considered a failure.
   */
  error?: ToolError;
}

/**
 * Discriminated union for tool display results.
 * Based on gemini's pattern - tools return data structures, UI decides how to render.
 */
export type ToolResultDisplay =
  | string              // Simple markdown or text
  | FileDiff            // File edit diffs
  | AnsiOutput          // Terminal output with ANSI codes
  | TaskListDisplay;    // Custom task list display

/**
 * File diff display for edit operations
 */
export interface FileDiff {
  fileDiff: string;           // Unified diff content
  fileName: string;
  originalContent: string | null;
  newContent: string;
  diffStat?: DiffStat;
}

export interface DiffStat {
  additions: number;
  deletions: number;
  changes: number;
}

/**
 * ANSI terminal output
 */
export interface AnsiOutput {
  type: 'ansi';
  content: string;
}

/**
 * Custom task list display
 */
export interface TaskListDisplay {
  type: 'task-list';
  tasks: Array<{
    content: string;
    activeForm: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  }>;
  stats?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
}

export interface ToolContext {
  abortSignal?: AbortSignal;
  onProgress?: (message: string) => void;
}

export enum ToolKind {
  Fetch = 'fetch',   // Weather, API calls
  Other = 'other'    // Default/uncategorized
}

export enum ToolStatus {
  Pending = 'pending',
  Executing = 'executing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum ToolErrorType {
  INVALID_PARAMS = 'invalid_params',
  EXECUTION_FAILED = 'execution_failed',
  TOOL_NOT_FOUND = 'tool_not_found',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  PERMISSION_DENIED = 'permission_denied',
  FILE_NOT_FOUND = 'file_not_found',
  UNKNOWN = 'unknown',
}

export interface ToolCall<TInput = unknown> {
  id: string;
  name: string;
  input: TInput;
  status: ToolStatus;
  result?: ToolResult;
}