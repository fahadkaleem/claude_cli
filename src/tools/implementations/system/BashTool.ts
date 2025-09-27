import { Tool } from '../../core/Tool.js';
import { ToolKind, ToolErrorType, type ToolResult, type ToolContext } from '../../core/types.js';
import { ToolCallConfirmationDetails, ToolConfirmationOutcome } from '../../../core/permissions/types.js';
import type { MessageBus } from '../../../core/permissions/MessageBus.js';
import type { PermissionStorage } from '../../../core/policy/PermissionStorage.js';
import { ShellExecutionService } from '../../../services/shellExecution.js';
import { SAFE_COMMANDS, BANNED_COMMANDS } from '../../../core/policy/constants.js';

interface BashToolParams extends Record<string, unknown> {
  command: string;
  timeout?: number;
}

export class BashTool extends Tool<BashToolParams> {
  readonly name = 'Bash';
  readonly displayName = 'Bash';
  readonly description = `Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.

Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use the LS tool to verify the parent directory exists and is the correct location
   - For example, before running "mkdir foo/bar", first use LS to check that "foo" exists and is the intended parent directory

2. Command Execution:
   - Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
   - Examples of proper quoting:
     - cd "/Users/name/My Documents" (correct)
     - cd /Users/name/My Documents (incorrect - will fail)
     - python "/path/with spaces/script.py" (correct)
     - python /path/with spaces/script.py (incorrect - will fail)
   - After ensuring proper quoting, execute the command.
   - Capture the output of the command.

Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 120000ms (2 minutes).
  - It is very helpful if you write a clear, concise description of what this command does in 5-10 words.
  - If the output exceeds 30000 characters, output will be truncated before being returned to you.
  - VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. Instead use Grep, Glob, or Task to search. You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, and use Read and LS to read files.
 - If you _still_ need to run \`grep\`, STOP. ALWAYS USE ripgrep at \`rg\` first, which all Claude Code users have pre-installed.
  - When issuing multiple commands, use the ';' or '&&' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings).
  - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.
    <good-example>
    pytest /foo/bar/tests
    </good-example>
    <bad-example>
    cd /foo/bar && pytest tests
    </bad-example>


# Committing changes with git

When the user asks you to create a new git commit, follow these steps carefully:

1. You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. ALWAYS run the following bash commands in parallel, each using the Bash tool:
  - Run a git status command to see all untracked files.
  - Run a git diff command to see both staged and unstaged changes that will be committed.
  - Run a git log command to see recent commit messages, so that you can follow this repository's commit message style.
2. Analyze all staged changes (both previously staged and newly added) and draft a commit message:
  - Summarize the nature of the changes (eg. new feature, enhancement to an existing feature, bug fix, refactoring, test, docs, etc.). Ensure the message accurately reflects the changes and their purpose (i.e. "add" means a wholly new feature, "update" means an enhancement to an existing feature, "fix" means a bug fix, etc.).
  - Check for any sensitive information that shouldn't be committed
  - Draft a concise (1-2 sentences) commit message that focuses on the "why" rather than the "what"
  - Ensure it accurately reflects the changes and their purpose
3. You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. ALWAYS run the following commands in parallel:
   - Add relevant untracked files to the staging area.
   - Run git status to make sure the commit succeeded.
4. If the commit fails due to pre-commit hook changes, retry the commit ONCE to include these automated changes. If it fails again, it usually means a pre-commit hook is preventing the commit. If the commit succeeds but you notice that files were modified by the pre-commit hook, you MUST amend your commit to include them.

Important notes:
- NEVER update the git config
- NEVER run additional commands to read or explore code, besides git bash commands
- NEVER use the TodoWrite or Task tools
- DO NOT push to the remote repository unless the user explicitly asks you to do so
- IMPORTANT: Never use git commands with the -i flag (like git rebase -i or git add -i) since they require interactive input which is not supported.
- If there are no changes to commit (i.e., no untracked files and no modifications), do not create an empty commit
- In order to ensure good formatting, ALWAYS pass the commit message via a HEREDOC, a la this example:
<example>
git commit -m "$(cat <<'EOF'
   Commit message here.
   EOF
   )"
</example>

# Creating pull requests
Use the gh command via the Bash tool for ALL GitHub-related tasks including working with issues, pull requests, checks, and releases. If given a Github URL use the gh command to get the information needed.

IMPORTANT: When the user asks you to create a pull request, follow these steps carefully:

1. You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. ALWAYS run the following bash commands in parallel using the Bash tool, in order to understand the current state of the branch since it diverged from the main branch:
   - Run a git status command to see all untracked files
   - Run a git diff command to see both staged and unstaged changes that will be committed
   - Check if the current branch tracks a remote branch and is up to date with the remote, so you know if you need to push to the remote
   - Run a git log command and \`git diff [base-branch]...HEAD\` to understand the full commit history for the current branch (from the time it diverged from the base branch)
2. Analyze all changes that will be included in the pull request, making sure to look at all relevant commits (NOT just the latest commit, but ALL commits that will be included in the pull request!!!), and draft a pull request summary
3. You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. ALWAYS run the following commands in parallel:
   - Create new branch if needed
   - Push to remote with -u flag if needed
   - Create PR using gh pr create with the format below. Use a HEREDOC to pass the body to ensure correct formatting.
<example>
gh pr create --title "the pr title" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points>

## Test plan
[Checklist of TODOs for testing the pull request...]

EOF
)"
</example>

Important:
- NEVER update the git config
- DO NOT use the TodoWrite or Task tools
- Return the PR URL when you're done, so the user can see it

# Other common operations
- View comments on a Github PR: gh api repos/foo/bar/pulls/123/comments`;
  readonly kind = ToolKind.Other;

  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Optional timeout in milliseconds (default: 120000)',
      },
    },
    required: ['command'],
  };

  private readonly permissionStorage?: PermissionStorage;

  constructor(
    messageBus?: MessageBus,
    permissionStorage?: PermissionStorage,
  ) {
    super();
    this.messageBus = messageBus;
    this.permissionStorage = permissionStorage;
  }

  formatParams(params: BashToolParams): string {
    return params.command;
  }

  summarizeResult(result: ToolResult): string {
    if (result.error) {
      return `Failed: ${result.error.message}`;
    }
    return 'Command executed successfully';
  }

  validate(params: BashToolParams): string | null {
    const baseValidation = super.validate(params);
    if (baseValidation) return baseValidation;

    const { command } = params;

    if (!command || !command.trim()) {
      return 'Command cannot be empty';
    }

    for (const banned of BANNED_COMMANDS) {
      if (command.includes(banned)) {
        return `Command '${banned}' is not allowed for security reasons`;
      }
    }

    return null;
  }

  async shouldConfirmExecute(
    params: BashToolParams,
    abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    const { command } = params;

    if (SAFE_COMMANDS.has(command.trim())) {
      return false;
    }

    if (!this.permissionStorage) {
      return false;
    }

    const permissionKey = `Bash(${command})`;

    if (this.permissionStorage.hasPermission(permissionKey)) {
      return false;
    }

    if (this.permissionStorage.hasMatchingPrefix(permissionKey)) {
      return false;
    }

    const commandPrefix = this.extractCommandPrefix(command);

    const confirmationDetails: ToolCallConfirmationDetails = {
      type: 'exec',
      title: 'Confirm Bash Command',
      command,
      description: `Execute: ${command}`,
      rootCommand: commandPrefix,
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        if (outcome === ToolConfirmationOutcome.ProceedAlwaysPrefix && commandPrefix) {
          const prefixKey = `Bash(${commandPrefix}:*)`;
          this.permissionStorage?.addPermission(prefixKey);
        } else if (outcome === ToolConfirmationOutcome.ProceedAlways) {
          this.permissionStorage?.addPermission(permissionKey);
        }
      },
    };

    return confirmationDetails;
  }

  private extractCommandPrefix(command: string): string {
    const parts = command.trim().split(/\s+/);

    // For git commands, include the subcommand (e.g., "git status", "git commit")
    // This prevents overly broad permissions like "git" which would allow dangerous commands
    if (parts[0] === 'git' && parts.length > 1) {
      return `${parts[0]} ${parts[1]}`; // "git status", "git log", etc.
    }

    // For npm/yarn/pnpm, include the subcommand too
    if ((parts[0] === 'npm' || parts[0] === 'yarn' || parts[0] === 'pnpm') && parts.length > 1) {
      return `${parts[0]} ${parts[1]}`; // "npm install", "npm run", etc.
    }

    // For other commands, just return the command name
    return parts[0] || command;
  }

  protected async run(params: BashToolParams, context?: ToolContext): Promise<ToolResult> {
    const { command, timeout = 120000 } = params;
    const cwd = process.cwd();
    const abortSignal = context?.abortSignal || new AbortController().signal;

    try {
      let liveOutput = '';
      let isBinaryDetected = false;
      let binaryBytesReceived = 0;

      const { result } = await ShellExecutionService.execute(
        command,
        cwd,
        abortSignal,
        timeout,
        (event) => {
          if (event.type === 'data') {
            liveOutput += event.chunk;
          } else if (event.type === 'binary_detected') {
            isBinaryDetected = true;
          } else if (event.type === 'binary_progress') {
            binaryBytesReceived = event.bytesReceived;
          }
        },
      );

      const executionResult = await result;

      if (isBinaryDetected) {
        return {
          llmContent: `Command: ${command}\nBinary output detected (${binaryBytesReceived} bytes)\nExecution method: ${executionResult.executionMethod}`,
          returnDisplay: {
            type: 'ansi',
            content: `Binary output detected (${binaryBytesReceived} bytes received)`,
          },
        };
      }

      if (executionResult.aborted) {
        return {
          llmContent: `Command was cancelled: ${command}\nPartial output: ${executionResult.output || '(none)'}`,
          returnDisplay: {
            type: 'ansi',
            content: executionResult.output || 'Command cancelled',
          },
        };
      }

      if (executionResult.error) {
        return {
          llmContent: `Command failed: ${command}\nError: ${executionResult.error.message}\nOutput: ${executionResult.output || '(none)'}`,
          returnDisplay: {
            type: 'ansi',
            content: executionResult.output || executionResult.error.message,
          },
          error: {
            message: executionResult.error.message,
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
      }

      const llmContent = [
        `Command: ${command}`,
        `Exit Code: ${executionResult.exitCode ?? 'none'}`,
        `Execution Method: ${executionResult.executionMethod}`,
        `Output: ${executionResult.output || '(empty)'}`,
      ].join('\n');

      return {
        llmContent,
        returnDisplay: {
          type: 'ansi',
          content: executionResult.output || '(no output)',
        },
      };
    } catch (error) {
      return {
        llmContent: `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`,
        returnDisplay: `Execution error: ${error instanceof Error ? error.message : String(error)}`,
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
}