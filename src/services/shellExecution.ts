import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import os from 'node:os';
import { isBinary } from '../utils/textUtils.js';

let pty: typeof import('node-pty') | null = null;

async function getPty(): Promise<typeof import('node-pty') | null> {
  if (pty !== null) return pty;

  try {
    pty = await import('node-pty');
    return pty;
  } catch {
    pty = null;
    return null;
  }
}

export interface ShellExecutionResult {
  output: string;
  exitCode: number | null;
  signal: string | null;
  error: Error | null;
  aborted: boolean;
  pid: number | undefined;
  executionMethod: 'pty' | 'child_process';
}

export interface ShellExecutionHandle {
  pid: number | undefined;
  result: Promise<ShellExecutionResult>;
}

export type ShellOutputEvent =
  | { type: 'data'; chunk: string }
  | { type: 'binary_detected' }
  | { type: 'binary_progress'; bytesReceived: number };

export class ShellExecutionService {
  static async execute(
    command: string,
    cwd: string,
    abortSignal: AbortSignal,
    timeout: number = 120000,
    onOutput?: (event: ShellOutputEvent) => void,
  ): Promise<ShellExecutionHandle> {
    const ptyModule = await getPty();
    const isWindows = os.platform() === 'win32';

    if (ptyModule && !isWindows) {
      return ShellExecutionService.executeWithPty(
        ptyModule,
        command,
        cwd,
        abortSignal,
        timeout,
        onOutput,
      );
    }

    return ShellExecutionService.executeWithChildProcess(
      command,
      cwd,
      abortSignal,
      timeout,
      onOutput,
    );
  }

  private static async executeWithPty(
    ptyModule: typeof import('node-pty'),
    command: string,
    cwd: string,
    abortSignal: AbortSignal,
    timeout: number,
    onOutput?: (event: ShellOutputEvent) => void,
  ): Promise<ShellExecutionHandle> {
    const ptyProcess = ptyModule.spawn('bash', ['-c', command], {
      name: 'xterm-256color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        PAGER: 'cat',
        GIT_PAGER: 'cat',
      },
    });

    let outputBuffer = Buffer.alloc(0);
    let isBinaryStream = false;
    let error: Error | null = null;
    let exited = false;
    let timeoutId: NodeJS.Timeout | undefined;

    const resultPromise = new Promise<ShellExecutionResult>((resolve) => {
      const handleExit = (code: number, signal?: number) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        exited = true;
        abortSignal.removeEventListener('abort', abortHandler);

        const output = outputBuffer.toString('utf-8').trim();

        resolve({
          output,
          exitCode: code,
          signal: signal ? signal.toString() : null,
          error,
          aborted: abortSignal.aborted,
          pid: ptyProcess.pid,
          executionMethod: 'pty',
        });
      };

      ptyProcess.onData((data) => {
        const chunk = Buffer.from(data, 'utf-8');
        outputBuffer = Buffer.concat([outputBuffer, chunk]);

        if (!isBinaryStream && isBinary(outputBuffer)) {
          isBinaryStream = true;
          onOutput?.({ type: 'binary_detected' });
        }

        if (isBinaryStream) {
          onOutput?.({ type: 'binary_progress', bytesReceived: outputBuffer.length });
        } else {
          onOutput?.({ type: 'data', chunk: data });
        }
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        handleExit(exitCode, signal);
      });

      const abortHandler = () => {
        if (!exited) {
          try {
            ptyProcess.kill('SIGTERM');
            setTimeout(() => {
              if (!exited) {
                try {
                  ptyProcess.kill('SIGKILL');
                } catch (e) {
                  // Process already dead
                }
              }
            }, 200);
          } catch (e) {
            // Process already dead
          }
        }
      };

      abortSignal.addEventListener('abort', abortHandler, { once: true });

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          if (!exited) {
            abortHandler();
          }
        }, timeout);
      }
    });

    return {
      pid: ptyProcess.pid,
      result: resultPromise,
    };
  }

  private static async executeWithChildProcess(
    command: string,
    cwd: string,
    abortSignal: AbortSignal,
    timeout: number,
    onOutput?: (event: ShellOutputEvent) => void,
  ): Promise<ShellExecutionHandle> {
    const isWindows = os.platform() === 'win32';

    let child: ChildProcess | null = null;

    const resultPromise = new Promise<ShellExecutionResult>((resolve) => {
      child = spawn(command, [], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: isWindows ? true : 'bash',
        detached: !isWindows,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          PAGER: 'cat',
          GIT_PAGER: 'cat',
        },
      });

      let outputBuffer = Buffer.alloc(0);
      let stderrBuffer = Buffer.alloc(0);
      let isBinaryStream = false;
      let error: Error | null = null;
      let exited = false;
      let timeoutId: NodeJS.Timeout | undefined;

      const handleExit = (code: number | null, signal: NodeJS.Signals | null) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        exited = true;
        abortSignal.removeEventListener('abort', abortHandler);

        const stdout = outputBuffer.toString('utf-8');
        const stderr = stderrBuffer.toString('utf-8');
        const combinedOutput = stdout + (stderr ? '\n' + stderr : '');

        resolve({
          output: combinedOutput.trim(),
          exitCode: code,
          signal: signal || null,
          error,
          aborted: abortSignal.aborted,
          pid: child?.pid,
          executionMethod: 'child_process',
        });
      };

      if (child.stdout) {
        child.stdout.on('data', (data: Buffer) => {
          outputBuffer = Buffer.concat([outputBuffer, data]);

          if (!isBinaryStream && isBinary(outputBuffer)) {
            isBinaryStream = true;
            onOutput?.({ type: 'binary_detected' });
          }

          if (isBinaryStream) {
            onOutput?.({ type: 'binary_progress', bytesReceived: outputBuffer.length });
          } else {
            onOutput?.({ type: 'data', chunk: data.toString('utf-8') });
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data: Buffer) => {
          stderrBuffer = Buffer.concat([stderrBuffer, data]);
          if (!isBinaryStream) {
            onOutput?.({ type: 'data', chunk: data.toString('utf-8') });
          }
        });
      }

      child.on('error', (err) => {
        error = err;
        handleExit(1, null);
      });

      child.on('exit', (code, signal) => {
        handleExit(code, signal);
      });

      const abortHandler = () => {
        if (child && child.pid && !exited) {
          if (isWindows) {
            spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t']);
          } else {
            try {
              process.kill(-child.pid, 'SIGTERM');
              setTimeout(() => {
                if (!exited && child?.pid) {
                  try {
                    process.kill(-child.pid, 'SIGKILL');
                  } catch (e) {
                    // Process already dead
                  }
                }
              }, 200);
            } catch (e) {
              if (!exited) {
                child?.kill('SIGKILL');
              }
            }
          }
        }
      };

      abortSignal.addEventListener('abort', abortHandler, { once: true });

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          if (!exited && child) {
            abortHandler();
          }
        }, timeout);
      }
    });

    return {
      pid: child?.pid,
      result: resultPromise,
    };
  }
}