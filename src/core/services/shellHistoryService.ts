import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import os from 'node:os';

const MAX_HISTORY_LENGTH = 100;

export class ShellHistoryService {
  private static historyFilePath: string | null = null;

  static async getHistoryFilePath(): Promise<string> {
    if (!this.historyFilePath) {
      const homeDir = os.homedir();
      const alfredDir = path.join(homeDir, '.alfred');
      this.historyFilePath = path.join(alfredDir, 'shell_history');
    }
    return this.historyFilePath;
  }

  static async readHistory(): Promise<string[]> {
    try {
      const filePath = await this.getHistoryFilePath();
      const text = await fs.readFile(filePath, 'utf-8');
      return text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  static async writeHistory(history: string[]): Promise<void> {
    const filePath = await this.getHistoryFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, history.join('\n'));
  }

  static async addCommand(command: string, existingHistory: string[]): Promise<string[]> {
    if (!command.trim()) {
      return existingHistory;
    }

    const newHistory = [command, ...existingHistory.filter((c) => c !== command)]
      .slice(0, MAX_HISTORY_LENGTH)
      .filter(Boolean);

    await this.writeHistory([...newHistory].reverse());
    return newHistory;
  }
}