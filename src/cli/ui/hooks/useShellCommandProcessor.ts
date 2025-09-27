import { useCallback } from 'react';
import { ShellExecutionService } from '../../../core/services/index.js';
import type { ShellExecutionConfig } from '../../../core/services/index.js';

export interface UseShellCommandProcessorOptions {
  onShellOutput: (output: string) => void;
  onShellComplete: (command: string, output: string, exitCode: number) => void;
  onShellError: (error: string) => void;
  shellConfig?: ShellExecutionConfig;
}

export interface UseShellCommandProcessorReturn {
  executeShellCommand: (command: string) => Promise<void>;
}

export function useShellCommandProcessor({
  onShellOutput,
  onShellComplete,
  onShellError,
  shellConfig,
}: UseShellCommandProcessorOptions): UseShellCommandProcessorReturn {
  const executeShellCommand = useCallback(
    async (command: string) => {
      const cwd = process.cwd();
      const abortController = new AbortController();

      try {
        const { pid, result } = await ShellExecutionService.execute(
          command,
          cwd,
          (event) => {
            switch (event.type) {
              case 'data':
                if (typeof event.chunk === 'string') {
                  onShellOutput(event.chunk);
                } else {
                  onShellOutput(event.chunk.content);
                }
                break;
              case 'binary_detected':
                onShellOutput('[Binary output detected]');
                break;
              case 'binary_progress':
                onShellOutput(`[Binary: ${event.bytesReceived} bytes received]`);
                break;
            }
          },
          shellConfig,
          abortController.signal,
        );

        const executionResult = await result;

        onShellComplete(
          command,
          executionResult.stdout.toString(),
          executionResult.exitCode,
        );
      } catch (error) {
        onShellError(
          error instanceof Error ? error.message : 'Unknown shell execution error',
        );
      }
    },
    [onShellOutput, onShellComplete, onShellError, shellConfig],
  );

  return {
    executeShellCommand,
  };
}