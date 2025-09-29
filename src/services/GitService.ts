import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface GitInfo {
  isRepository: boolean;
  currentBranch?: string;
  isDirty?: boolean;
  remoteUrl?: string;
}

export class GitService {
  private initialized = false;
  private gitInfo: GitInfo | null = null;

  constructor(
    private readonly targetDir: string
  ) {}

  /**
   * Initialize the service and cache git information
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.gitInfo = await this.getGitInfo();
    this.initialized = true;
  }

  /**
   * Check if the current directory is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    if (this.gitInfo) {
      return this.gitInfo.isRepository;
    }

    try {
      await execAsync('git rev-parse --git-dir', {
        cwd: this.targetDir
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current git branch
   */
  async getCurrentBranch(): Promise<string | undefined> {
    if (this.gitInfo) {
      return this.gitInfo.currentBranch;
    }

    try {
      const { stdout } = await execAsync('git branch --show-current', {
        cwd: this.targetDir
      });
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Check if working directory has uncommitted changes
   */
  async isDirty(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: this.targetDir
      });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get remote origin URL
   */
  async getRemoteUrl(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('git remote get-url origin', {
        cwd: this.targetDir
      });
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Get all git information at once
   */
  private async getGitInfo(): Promise<GitInfo> {
    const isRepository = await this.isGitRepository();

    if (!isRepository) {
      return { isRepository: false };
    }

    const [currentBranch, isDirty, remoteUrl] = await Promise.all([
      this.getCurrentBranch(),
      this.isDirty(),
      this.getRemoteUrl()
    ]);

    return {
      isRepository,
      currentBranch,
      isDirty,
      remoteUrl
    };
  }

  /**
   * Get cached git info or fetch if not initialized
   */
  async getCachedInfo(): Promise<GitInfo> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.gitInfo!;
  }

  /**
   * Run arbitrary git command (for advanced operations)
   */
  async runCommand(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${command}`, {
        cwd: this.targetDir
      });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Git command failed: ${error}`);
    }
  }
}