/**
 * Configuration service for the Alfred CLI application
 */

import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { ToolRegistry } from '../tools/core/ToolRegistry.js';
import type { Tool } from '../tools/core/Tool.js';
import { ToolExecutor } from '../tools/core/ToolExecutor.js';
import { MessageLogger } from '../services/logging/MessageLogger.js';
import { PromptService } from '../prompts/PromptService.js';
import { GitService } from '../services/GitService.js';
import { AnthropicClient } from '../core/AnthropicClient.js';
import type { ChatClient } from '../core/ChatClient.js';
import { Storage } from './storage.js';
import { CommandService } from '../services/CommandService.js';
import { PermissionManager } from '../services/PermissionManager.js';

export interface ConfigOptions {
  /** API key for Anthropic */
  apiKey?: string;

  /** Model to use (e.g., 'claude-3-opus-20240229') */
  model?: string;

  /** Maximum tokens for responses */
  maxTokens?: number;

  /** Enable debug mode */
  debug?: boolean;

  /** Custom log directory */
  logDir?: string;

  /** Maximum number of turns in agent loop */
  maxTurns?: number;

  /** Custom config file path */
  configPath?: string;

  /** Enable message logging */
  enableLogging?: boolean;
}

export class Config {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly debug: boolean;
  private readonly logDir: string;
  private readonly maxTurns: number;
  private toolRegistry?: ToolRegistry;
  private toolExecutor?: ToolExecutor;
  private messageLogger?: MessageLogger;
  private promptService?: PromptService;
  private gitService?: GitService;
  private storage?: Storage;
  private commandService?: CommandService;
  private permissionManager?: PermissionManager;
  private chatClient?: ChatClient;
  private initialized = false;
  private readonly targetDir: string;

  constructor(options: ConfigOptions = {}) {
    // Load configuration from environment and files
    this.apiKey = this.resolveApiKey(options.apiKey);
    this.model = options.model || process.env.ALFRED_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxTokens = options.maxTokens || parseInt(process.env.ALFRED_MAX_TOKENS || '4096', 10);
    this.debug = options.debug || process.env.ALFRED_DEBUG === '1' || process.env.DEBUG === 'true';
    this.logDir = options.logDir || process.env.ALFRED_LOG_DIR || join(homedir(), '.alfred', 'logs');
    this.maxTurns = options.maxTurns || parseInt(process.env.ALFRED_MAX_TURNS || '100', 10);
    this.targetDir = process.cwd();
  }

  /**
   * Resolve API key from various sources
   */
  private resolveApiKey(providedKey?: string): string {
    // Priority order:
    // 1. Provided directly
    if (providedKey) {
      return providedKey;
    }

    // 2. Environment variable
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }

    // 3. Config file
    const configPath = join(homedir(), '.alfred', 'config.json');
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.apiKey) {
          return config.apiKey;
        }
      } catch (error) {
        console.warn('Failed to read config file:', error);
      }
    }

    throw new Error(
      'No API key found. Please set ANTHROPIC_API_KEY environment variable or provide it in the config'
    );
  }

  /**
   * Get the API key
   */
  getApiKey(): string {
    return this.apiKey;
  }

  /**
   * Get the model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get max tokens
   */
  getMaxTokens(): number {
    return this.maxTokens;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.debug;
  }

  /**
   * Get the log directory
   */
  getLogDir(): string {
    return this.logDir;
  }

  /**
   * Get maximum turns for agent loop
   */
  getMaxTurns(): number {
    return this.maxTurns;
  }

  /**
   * Initialize the configuration and all services
   * Must only be called once, throws if called again
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Config was already initialized');
    }

    // Create all services
    this.messageLogger = new MessageLogger({
      enabled: (this.debug || process.env.ALFRED_ENABLE_LOGGING === '1'),
      logDir: this.logDir
    });

    this.gitService = new GitService(this.targetDir);
    await this.gitService.initialize();

    this.promptService = new PromptService(this.gitService, this.messageLogger);
    await this.promptService.initializeGitInfo();

    this.toolRegistry = new ToolRegistry();
    await this.createToolRegistry();

    this.toolExecutor = new ToolExecutor(this.toolRegistry);

    this.storage = new Storage(this.targetDir);

    this.commandService = new CommandService();
    await this.registerBuiltInCommands();

    this.permissionManager = new PermissionManager();

    // Create and initialize chat client
    this.chatClient = new AnthropicClient(this);
    await this.chatClient.initialize();

    this.initialized = true;
  }

  /**
   * Get the tool registry
   */
  getToolRegistry(): ToolRegistry {
    if (!this.toolRegistry) {
      throw new Error('Tool registry not initialized. Call initialize() first.');
    }
    return this.toolRegistry;
  }

  /**
   * Get the tool executor
   */
  getToolExecutor(): ToolExecutor {
    if (!this.toolExecutor) {
      throw new Error('Tool executor not initialized. Call initialize() first.');
    }
    return this.toolExecutor;
  }

  /**
   * Get the message logger
   */
  getMessageLogger(): MessageLogger {
    if (!this.messageLogger) {
      throw new Error('Message logger not initialized. Call initialize() first.');
    }
    return this.messageLogger;
  }

  /**
   * Get the git service
   */
  getGitService(): GitService {
    if (!this.gitService) {
      throw new Error('Git service not initialized. Call initialize() first.');
    }
    return this.gitService;
  }

  /**
   * Get the prompt service
   */
  getPromptService(): PromptService {
    if (!this.promptService) {
      throw new Error('Prompt service not initialized. Call initialize() first.');
    }
    return this.promptService;
  }

  /**
   * Get the chat client
   */
  getChatClient(): ChatClient {
    if (!this.chatClient) {
      throw new Error('Chat client not initialized. Call initialize() first.');
    }
    return this.chatClient;
  }

  /**
   * Check if config is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the target directory
   */
  getTargetDir(): string {
    return this.targetDir;
  }

  /**
   * Get the storage service
   */
  getStorage(): Storage {
    if (!this.storage) {
      throw new Error('Storage service not initialized. Call initialize() first.');
    }
    return this.storage;
  }

  /**
   * Get the command service
   */
  getCommandService(): CommandService {
    if (!this.commandService) {
      throw new Error('Command service not initialized. Call initialize() first.');
    }
    return this.commandService;
  }

  /**
   * Get the permission manager
   */
  getPermissionManager(): PermissionManager {
    if (!this.permissionManager) {
      throw new Error('Permission manager not initialized. Call initialize() first.');
    }
    return this.permissionManager;
  }

  /**
   * Create and initialize a config instance from environment
   * Factory pattern following Gemini architecture
   */
  static async create(options: ConfigOptions = {}): Promise<Config> {
    const config = new Config(options);
    await config.initialize();
    return config;
  }

  /**
   * Create a default config instance from environment
   * Note: Caller must call initialize() separately
   */
  static fromEnvironment(): Config {
    return new Config();
  }

  /**
   * Create a config instance from a file
   * Note: Caller must call initialize() separately
   */
  static fromFile(filePath: string): Config {
    if (!existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }

    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const options = JSON.parse(fileContent);
      return new Config(options);
    } catch (error) {
      throw new Error(`Failed to load config from file: ${error}`);
    }
  }

  /**
   * Create and populate the tool registry
   * Explicit tool registration
   */
  private async createToolRegistry(): Promise<void> {
    // Import only the tools that actually exist
    const { ReadTool } = await import('../tools/implementations/filesystem/ReadTool.js');
    const { WriteTool } = await import('../tools/implementations/filesystem/WriteTool.js');
    const { EditTool } = await import('../tools/implementations/filesystem/EditTool.js');
    const { BashTool } = await import('../tools/implementations/system/BashTool.js');
    const { TaskWriteTool } = await import('../tools/implementations/workflow/TaskWriteTool.js');

    // Helper to register tools
    const registerTool = (ToolClass: any, ...args: any[]) => {
      try {
        const tool = new ToolClass(...args);
        this.toolRegistry.register(tool);
        if (this.debug) {
          console.log(`Registered tool: ${tool.name}`);
        }
      } catch (error) {
        console.error(`Failed to register tool ${ToolClass.name}:`, error);
      }
    };

    // Register all tools explicitly
    registerTool(ReadTool);
    registerTool(WriteTool);
    registerTool(EditTool);
    registerTool(BashTool);  // Simplified - no session storage
    registerTool(TaskWriteTool);

    if (this.debug) {
      console.log(`Total tools registered: ${this.toolRegistry.getSchemas().length}`);
    }
  }

  /**
   * Register built-in commands
   * Explicit command registration during initialization
   */
  private async registerBuiltInCommands(): Promise<void> {
    // Import command registration function
    const { registerBuiltInCommands } = await import('../cli/ui/commands/registerCommands.js');

    // Register all commands with our command service
    registerBuiltInCommands(this.commandService);
  }

  /**
   * Get a summary of the configuration
   */
  getSummary(): Record<string, any> {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      debug: this.debug,
      logDir: this.logDir,
      maxTurns: this.maxTurns,
      toolsAvailable: this.toolRegistry.getSchemas().length,
      loggingEnabled: this.messageLogger.isEnabled(),
      initialized: this.initialized
    };
  }
}