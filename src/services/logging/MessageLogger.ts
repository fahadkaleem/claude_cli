/**
 * Message logging service for debugging and telemetry
 */

import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import type { ToolSchema, AnthropicResponse } from '../../core/types.js';

export interface LoggerConfig {
  enabled: boolean;
  logDir?: string;
  logFileName?: string;
}

export interface LogEntry {
  timestamp: string;
  type: 'request' | 'response' | 'tool_execution' | 'error';
  data: any;
}

/**
 * Message logger service for API request/response logging
 */
export class MessageLogger {
  private readonly enabled: boolean;
  private readonly logFilePath: string;

  constructor(config: LoggerConfig = { enabled: false }) {
    this.enabled = config.enabled;

    if (this.enabled) {
      const baseDir = config.logDir || join(homedir(), '.alfred', 'logs');

      if (!existsSync(baseDir)) {
        mkdirSync(baseDir, { recursive: true });
      }

      const fileName = config.logFileName || 'messages.jsonl';
      this.logFilePath = join(baseDir, fileName);
    } else {
      this.logFilePath = '';
    }
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Log an API request
   */
  logRequest(messages: MessageParam[], tools?: ToolSchema[]): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'request',
      data: {
        messageCount: messages.length,
        messages: messages,
        toolCount: tools?.length || 0,
        tools: tools?.map(t => ({
          name: t.name,
          description: t.description
        }))
      }
    };

    this.writeLogEntry(entry);
  }

  /**
   * Log an API response
   */
  logResponse(response: AnthropicResponse): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'response',
      data: {
        id: response.id,
        model: response.model,
        stop_reason: response.stop_reason,
        usage: response.usage,
        content: response.content
      }
    };

    this.writeLogEntry(entry);
  }

  /**
   * Log tool execution
   */
  logToolExecution(name: string, input: any, result: any): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'tool_execution',
      data: {
        tool: name,
        input: input,
        result: result
      }
    };

    this.writeLogEntry(entry);
  }

  /**
   * Log an error
   */
  logError(error: Error, context?: any): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'error',
      data: {
        error: error.message,
        stack: error.stack,
        context: context
      }
    };

    this.writeLogEntry(entry);
  }

  /**
   * Write a log entry to file
   */
  private writeLogEntry(entry: LogEntry): void {
    try {
      const line = JSON.stringify(entry) + '\n';
      appendFileSync(this.logFilePath, line);
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }
}

/**
 * Create a default logger instance
 */
export function createDefaultLogger(): MessageLogger {
  const isDebug = process.env.ALFRED_DEBUG === '1' ||
                  process.env.DEBUG === 'true';

  return new MessageLogger({
    enabled: isDebug,
    logDir: process.env.ALFRED_LOG_DIR,
    logFileName: process.env.ALFRED_LOG_FILE
  });
}