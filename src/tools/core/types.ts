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

export interface ToolResult<TOutput = unknown> {
  success: boolean;
  output: TOutput;
  display?: ToolDisplay;
  error?: ToolError;
}

import type { DisplayTypeValue } from '../../cli/ui/constants.js';

export interface ToolDisplay {
  type: DisplayTypeValue;
  content: string;
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