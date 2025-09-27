import type { ToolCall } from '../permissions/types.js';
import type { PermissionStorage } from './PermissionStorage.js';
import { PolicyDecision } from './types.js';
import { SAFE_COMMANDS } from './constants.js';

export class PolicyEngine {
  constructor(private readonly storage: PermissionStorage) {}

  check(toolCall: ToolCall): PolicyDecision {
    const permissionKey = this.getPermissionKey(toolCall);

    const permissions = this.storage.load();

    if (permissions.deny.includes(permissionKey)) {
      return PolicyDecision.DENY;
    }

    if (permissions.allow.includes(permissionKey)) {
      return PolicyDecision.ALLOW;
    }

    if (this.storage.hasMatchingPrefix(permissionKey)) {
      return PolicyDecision.ALLOW;
    }

    if (this.isSafeCommand(toolCall)) {
      return PolicyDecision.ALLOW;
    }

    return PolicyDecision.ASK_USER;
  }

  private getPermissionKey(toolCall: ToolCall): string {
    if (toolCall.name === 'bash' && toolCall.args.command) {
      const command = toolCall.args.command as string;
      return `Bash(${command})`;
    }
    return toolCall.name;
  }

  private isSafeCommand(toolCall: ToolCall): boolean {
    if (toolCall.name !== 'bash') {
      return false;
    }

    const command = (toolCall.args.command as string)?.trim();
    return SAFE_COMMANDS.has(command);
  }

  getPermissionKeyWithPrefix(toolCall: ToolCall, prefix: string): string {
    if (toolCall.name === 'bash') {
      return `Bash(${prefix}:*)`;
    }
    return toolCall.name;
  }
}