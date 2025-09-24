export interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolResult {
  success: boolean;
  output: any;
  display?: ToolDisplay;
  error?: string;
}

export interface ToolDisplay {
  type: 'text' | 'markdown' | 'json' | 'error';
  content: string;
}

export interface ToolContext {
  abortSignal?: AbortSignal;
  onProgress?: (message: string) => void;
}

export enum ToolStatus {
  Pending = 'pending',
  Executing = 'executing',
  Completed = 'completed',
  Failed = 'failed',
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  status: ToolStatus;
  result?: ToolResult;
}