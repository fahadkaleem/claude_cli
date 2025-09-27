import { spawn } from 'node:child_process';
import * as pty from 'node-pty';
import os from 'node:os';
import stripAnsi from 'strip-ansi';

const SIGKILL_TIMEOUT_MS = 200;
const BINARY_CHECK_THRESHOLD = 1024;

export interface AnsiOutput {
  type: 'ansi';
  content: string;
}

export interface ShellExecutionResult {
  stdout: string | AnsiOutput;
  stderr: string;
  exitCode: number;
  workingDir?: string;
  pid?: number;
}

export interface ShellExecutionConfig {
  terminalWidth: number;
  terminalHeight: number;
  pager?: string;
  showColor?: boolean;
  defaultFg?: string;
  defaultBg?: string;
}

export interface ShellOutputEvent {
  type: 'data' | 'binary_detected' | 'binary_progress';
  chunk?: string | AnsiOutput;
  bytesReceived?: number;
}

export interface ShellExecutionHandle {
  pid: number | undefined;
  result: Promise<ShellExecutionResult>;
}

function isBinary(data: Buffer | null | undefined, sampleSize = 512): boolean {
  if (!data) {
    return false;
  }

  const sample = data.length > sampleSize ? data.subarray(0, sampleSize) : data;

  for (const byte of sample) {
    if (byte === 0) {
      return true;
    }
  }

  return false;
}

export class ShellExecutionService {
  private static activePtys = new Map<number, pty.IPty>();
  private static ptyIdCounter = 0;
  private static defaultConfig: ShellExecutionConfig = {
    terminalWidth: 120,
    terminalHeight: 30,
    showColor: true,
  };

  static async execute(
    command: string,
    cwd: string,
    onOutput?: (event: ShellOutputEvent) => void,
    config?: ShellExecutionConfig,
    abortSignal?: AbortSignal,
  ): Promise<ShellExecutionHandle> {
    return this.executeChildProcess(command, cwd, onOutput, abortSignal);
  }

  private static async executePty(
    command: string,
    cwd: string,
    onOutput?: (event: ShellOutputEvent) => void,
    config?: ShellExecutionConfig,
    abortSignal?: AbortSignal,
  ): Promise<ShellExecutionHandle> {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: config?.terminalWidth || 120,
      rows: config?.terminalHeight || 30,
      cwd,
      env: process.env as { [key: string]: string },
    });

    const ptyId = this.ptyIdCounter++;
    this.activePtys.set(ptyId, ptyProcess);

    const pid = ptyProcess.pid;
    let stdout = '';
    let stderr = '';
    let isBinaryOutput = false;
    let bytesReceived = 0;
    const rawOutput = Buffer.alloc(0);

    const result = new Promise<ShellExecutionResult>((resolve) => {
      ptyProcess.onData((data: string) => {
        bytesReceived += Buffer.byteLength(data);

        if (!isBinaryOutput && isBinary(Buffer.from(data))) {
          isBinaryOutput = true;
          onOutput?.({ type: 'binary_detected' });
          return;
        }

        if (isBinaryOutput) {
          onOutput?.({ type: 'binary_progress', bytesReceived });
          return;
        }

        stdout += data;

        onOutput?.({
          type: 'data',
          chunk: data,
        });
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        this.activePtys.delete(ptyId);

        resolve({
          stdout: isBinaryOutput ? `[Binary output: ${bytesReceived} bytes]` : stdout,
          stderr,
          exitCode: exitCode,
          workingDir: cwd,
          pid,
        });
      });

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          ptyProcess.kill();
          this.activePtys.delete(ptyId);
        });
      }

      ptyProcess.write(command + '\r');
      ptyProcess.write('exit\r');
    });

    return { pid, result };
  }

  private static async executeChildProcess(
    command: string,
    cwd: string,
    onOutput?: (event: ShellOutputEvent) => void,
    abortSignal?: AbortSignal,
  ): Promise<ShellExecutionHandle> {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
    const args = os.platform() === 'win32' ? ['-Command', command] : ['-c', command];

    const childProcess = spawn(shell, args, {
      cwd,
      env: process.env,
    });

    const pid = childProcess.pid;
    let stdout = '';
    let stderr = '';
    let isBinaryOutput = false;
    let bytesReceived = 0;

    const result = new Promise<ShellExecutionResult>((resolve, reject) => {
      childProcess.stdout?.on('data', (chunk: Buffer) => {
        bytesReceived += chunk.length;

        if (!isBinaryOutput && isBinary(chunk)) {
          isBinaryOutput = true;
          onOutput?.({ type: 'binary_detected' });
          return;
        }

        if (isBinaryOutput) {
          onOutput?.({ type: 'binary_progress', bytesReceived });
          return;
        }

        const text = chunk.toString('utf8');
        stdout += text;

        onOutput?.({
          type: 'data',
          chunk: text,
        });
      });

      childProcess.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      childProcess.on('exit', (exitCode, signal) => {
        resolve({
          stdout: isBinaryOutput ? `[Binary output: ${bytesReceived} bytes]` : stdout,
          stderr,
          exitCode: exitCode || 0,
          workingDir: cwd,
          pid,
        });
      });

      childProcess.on('error', (error) => {
        reject(error);
      });

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          childProcess.kill('SIGTERM');
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL');
            }
          }, SIGKILL_TIMEOUT_MS);
        });
      }
    });

    return { pid, result };
  }

  static resizePty(ptyId: number, cols: number, rows: number): void {
    const ptyProcess = this.activePtys.get(ptyId);
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
    }
  }

  static killPty(ptyId: number): void {
    const ptyProcess = this.activePtys.get(ptyId);
    if (ptyProcess) {
      ptyProcess.kill();
      this.activePtys.delete(ptyId);
    }
  }
}