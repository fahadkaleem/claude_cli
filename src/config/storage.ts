import * as path from 'path';
import * as os from 'os';

export const ALFRED_CONFIG_FILENAME = '.alfred.json';

export class Storage {
  private readonly targetDir: string;

  constructor(targetDir: string) {
    this.targetDir = path.resolve(targetDir);
  }

  static getAlfredConfigPath(): string {
    const homeDir = os.homedir();
    if (!homeDir) {
      return path.join(os.tmpdir(), ALFRED_CONFIG_FILENAME);
    }
    return path.join(homeDir, ALFRED_CONFIG_FILENAME);
  }

  getProjectRoot(): string {
    return this.targetDir;
  }
}

// Storage is now created in Config class, no singleton
// But we keep this for backward compatibility with alfredConfig.ts
// TODO: Refactor alfredConfig.ts to use DI
export const storage = new Storage(process.cwd());