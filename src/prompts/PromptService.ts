import fs from 'fs';
import path from 'path';
import os from 'os';
import type { GitService } from '../services/GitService.js';
import type { MessageLogger } from '../services/logging/MessageLogger.js';

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
  private systemPromptPaths: string[];
  private readonly defaultSystemPrompt = `You are Alfred, a helpful CLI assistant with access to tools. Be concise, direct, and focused on helping with command-line tasks.

Key guidelines:
- Respond concisely - aim for 1-3 lines unless more detail is needed
- Execute tools when appropriate to help the user
- Prioritize clarity and accuracy
- Focus on the specific task at hand`;
  private gitInfo: { isGitRepo: boolean; branch?: string } | null = null;

  constructor(
    private readonly gitService: GitService,
    private readonly logger: MessageLogger
  ) {
    // Priority order for loading system prompts:
    this.systemPromptPaths = [];

    // 1. Environment variable override (highest priority)
    const customPath = process.env.ALFRED_SYSTEM_MD;
    if (customPath) {
      this.systemPromptPaths.push(this.expandPath(customPath));
    }

    // 2. Codebase prompt (for development)
    const codebasePath = path.join(process.cwd(), 'src', 'prompts', 'system.md');
    this.systemPromptPaths.push(codebasePath);

    // 3. User config directory (for user customization)
    const userConfigPath = path.join(os.homedir(), '.alfred', 'system.md');
    this.systemPromptPaths.push(userConfigPath);
  }

  private expandPath(filepath: string): string {
    if (filepath.startsWith('~/')) {
      return path.join(os.homedir(), filepath.slice(2));
    }
    return path.resolve(filepath);
  }

  /**
   * Load the base system prompt from file or use default
   * Tries paths in priority order
   */
  private loadSystemPrompt(): string {
    // Try each path in priority order
    for (const promptPath of this.systemPromptPaths) {
      if (fs.existsSync(promptPath)) {
        // Log loading system prompt (not as a message since 'system' role doesn't exist)
        if (this.logger.isEnabled()) {
          console.log(`Loading system prompt from: ${promptPath}`);
        }
        return fs.readFileSync(promptPath, 'utf-8');
      }
    }

    // Fall back to default if no files found
    // Log using default prompt (not as a message since 'system' role doesn't exist)
    if (this.logger.isEnabled()) {
      console.log('Using default system prompt (no custom prompt files found)');
    }
    return this.defaultSystemPrompt;
  }

  /**
   * Initialize git information asynchronously
   */
  async initializeGitInfo(): Promise<void> {
    const isGitRepo = await this.gitService.isGitRepository();
    const branch = isGitRepo ? await this.gitService.getCurrentBranch() : undefined;
    this.gitInfo = { isGitRepo, branch };
  }

  /**
   * Gather dynamic context information
   */
  async getContextInfo(toolCount: number = 0): Promise<ContextInfo> {
    // Initialize git info if not already done
    if (!this.gitInfo) {
      await this.initializeGitInfo();
    }

    return {
      workingDirectory: process.cwd(),
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      platform: process.platform,
      isGitRepo: this.gitInfo.isGitRepo,
      gitBranch: this.gitInfo.branch,
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
  async getSystemPrompt(toolCount: number = 0, customContext?: Record<string, unknown>): Promise<string> {
    const context = await this.getContextInfo(toolCount);
    if (customContext) {
      context.customContext = customContext;
    }
    return this.buildSystemPrompt(context);
  }

  /**
   * Write the default system prompt to file (for user customization)
   */
  async initializeSystemPromptFile(): Promise<void> {
    // Use the user config path for initialization (last in the paths array)
    const userConfigPath = path.join(os.homedir(), '.alfred', 'system.md');
    const dir = path.dirname(userConfigPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Copy from codebase prompt if it exists, otherwise use default
    const codebasePromptPath = path.join(process.cwd(), 'src', 'prompts', 'system.md');
    let promptContent = this.defaultSystemPrompt;

    if (fs.existsSync(codebasePromptPath)) {
      promptContent = fs.readFileSync(codebasePromptPath, 'utf-8');
    }

    // Only write if file doesn't exist
    if (!fs.existsSync(userConfigPath)) {
      fs.writeFileSync(userConfigPath, promptContent, 'utf-8');
      // Log using console.log instead (since 'system' role doesn't exist in Message type)
      if (this.logger.isEnabled()) {
        console.log(`Created system prompt file at: ${userConfigPath}`);
      }
    }
  }
}