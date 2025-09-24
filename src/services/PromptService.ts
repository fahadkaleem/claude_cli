import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export interface ContextInfo {
  workingDirectory: string;
  date: string;
  platform: string;
  isGitRepo: boolean;
  gitBranch?: string;
  toolsAvailable: number;
  customContext?: Record<string, unknown>;
}

export class PromptService {
  private systemPromptPath: string;
  private defaultSystemPrompt = `You are Alfred, a helpful CLI assistant with access to tools. Be concise, direct, and focused on helping with command-line tasks.

Key guidelines:
- Respond concisely - aim for 1-3 lines unless more detail is needed
- Execute tools when appropriate to help the user
- Prioritize clarity and accuracy
- Focus on the specific task at hand`;

  constructor() {
    // Default path: ~/.alfred/system.md
    const configDir = path.join(os.homedir(), '.alfred');
    this.systemPromptPath = path.join(configDir, 'system.md');

    // Allow override via environment variable
    const customPath = process.env.ALFRED_SYSTEM_MD;
    if (customPath) {
      this.systemPromptPath = this.expandPath(customPath);
    }
  }

  private expandPath(filepath: string): string {
    if (filepath.startsWith('~/')) {
      return path.join(os.homedir(), filepath.slice(2));
    }
    return path.resolve(filepath);
  }

  /**
   * Load the base system prompt from file or use default
   */
  private loadSystemPrompt(): string {
    try {
      if (fs.existsSync(this.systemPromptPath)) {
        return fs.readFileSync(this.systemPromptPath, 'utf-8');
      }
    } catch (error) {
      console.warn(`Failed to load system prompt from ${this.systemPromptPath}:`, error);
    }
    return this.defaultSystemPrompt;
  }

  /**
   * Check if current directory is a git repository
   */
  private isGitRepository(): boolean {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current git branch if in a git repo
   */
  private getGitBranch(): string | undefined {
    try {
      return execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Gather dynamic context information
   */
  getContextInfo(toolCount: number = 0): ContextInfo {
    const isGitRepo = this.isGitRepository();

    return {
      workingDirectory: process.cwd(),
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      platform: process.platform,
      isGitRepo,
      gitBranch: isGitRepo ? this.getGitBranch() : undefined,
      toolsAvailable: toolCount
    };
  }

  /**
   * Build the complete system prompt with context
   */
  buildSystemPrompt(context: ContextInfo): string {
    const basePrompt = this.loadSystemPrompt();

    const contextParts: string[] = [
      basePrompt,
      '',
      '# Context',
      `Working directory: ${context.workingDirectory}`,
      `Today's date: ${context.date}`,
      `Platform: ${context.platform}`
    ];

    if (context.isGitRepo) {
      contextParts.push('');
      contextParts.push('# Git Repository');
      contextParts.push('You are in a git repository.');
      if (context.gitBranch) {
        contextParts.push(`Current branch: ${context.gitBranch}`);
      }
      contextParts.push('When committing, review changes with `git diff` and follow project conventions.');
    }

    if (context.toolsAvailable > 0) {
      contextParts.push('');
      contextParts.push(`# Tools`);
      contextParts.push(`You have access to ${context.toolsAvailable} tools to help complete tasks.`);
    }

    // Add any custom context
    if (context.customContext) {
      contextParts.push('');
      contextParts.push('# Additional Context');
      for (const [key, value] of Object.entries(context.customContext)) {
        contextParts.push(`${key}: ${JSON.stringify(value)}`);
      }
    }

    return contextParts.join('\n');
  }

  /**
   * Get the full system prompt with all context
   */
  getSystemPrompt(toolCount: number = 0, customContext?: Record<string, unknown>): string {
    const context = this.getContextInfo(toolCount);
    if (customContext) {
      context.customContext = customContext;
    }
    return this.buildSystemPrompt(context);
  }

  /**
   * Write the default system prompt to file (for user customization)
   */
  async initializeSystemPromptFile(): Promise<void> {
    const dir = path.dirname(this.systemPromptPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Only write if file doesn't exist
    if (!fs.existsSync(this.systemPromptPath)) {
      fs.writeFileSync(this.systemPromptPath, this.defaultSystemPrompt, 'utf-8');
      console.log(`Created system prompt file at: ${this.systemPromptPath}`);
      console.log('You can customize this file to change the assistant\'s behavior.');
    }
  }
}

// Singleton instance
export const promptService = new PromptService();