import { EventEmitter } from 'node:events';
import type { PermissionRequestData } from '../tools/core/types.js';
import type { ToolCallConfirmationDetails, ToolConfirmationOutcome } from '../core/permissions/types.js';

type PermissionResponse = {
  approved: boolean;
  permanent: boolean;
};

interface PermissionEvents {
  'permission-requested': (toolId: string, data: PermissionRequestData) => void;
  'confirmation-requested': (confirmationId: string, details: ToolCallConfirmationDetails) => void;
}

export class PermissionManager extends EventEmitter {
  private pendingPermissions: Map<string, {
    resolve: (response: PermissionResponse) => void;
    data: PermissionRequestData;
  }> = new Map();

  private pendingConfirmations: Map<string, {
    resolve: (outcome: ToolConfirmationOutcome) => void;
    details: ToolCallConfirmationDetails;
  }> = new Map();

  // Simple session allowlist for edit permissions
  private editAllowlist: Set<string> = new Set();

  constructor() {
    super();
  }

  async requestPermission(
    toolId: string,
    data: PermissionRequestData
  ): Promise<PermissionResponse> {
    // Check if edits are allowed for this session
    if (this.editAllowlist.has('all-edits')) {
      return Promise.resolve({ approved: true, permanent: true });
    }

    return new Promise((resolve) => {
      this.pendingPermissions.set(toolId, { resolve, data });
      this.emit('permission-requested', toolId, data);
    });
  }

  async requestConfirmation(
    confirmationId: string,
    details: ToolCallConfirmationDetails
  ): Promise<ToolConfirmationOutcome> {
    return new Promise((resolve) => {
      this.pendingConfirmations.set(confirmationId, { resolve, details });
      this.emit('confirmation-requested', confirmationId, details);
    });
  }

  respondToPermission(toolId: string, approved: boolean, permanent: boolean): void {
    const pending = this.pendingPermissions.get(toolId);
    if (pending) {
      if (approved && permanent) {
        // Add to edit allowlist for this session
        this.editAllowlist.add('all-edits');
      }
      pending.resolve({ approved, permanent });
      this.pendingPermissions.delete(toolId);
    }
  }

  respondToConfirmation(confirmationId: string, outcome: ToolConfirmationOutcome): void {
    const pending = this.pendingConfirmations.get(confirmationId);
    if (pending) {
      pending.resolve(outcome);
      this.pendingConfirmations.delete(confirmationId);
    }
  }

  getPendingPermission(toolId: string): PermissionRequestData | undefined {
    return this.pendingPermissions.get(toolId)?.data;
  }

  getPendingConfirmation(confirmationId: string): ToolCallConfirmationDetails | undefined {
    return this.pendingConfirmations.get(confirmationId)?.details;
  }

  hasPendingPermission(toolId: string): boolean {
    return this.pendingPermissions.has(toolId);
  }

  hasPendingConfirmation(confirmationId: string): boolean {
    return this.pendingConfirmations.has(confirmationId);
  }

  hasEditPermission(): boolean {
    return this.editAllowlist.has('all-edits');
  }

  clearSessionPermissions(): void {
    this.editAllowlist.clear();
  }
}

// PermissionManager is now created in Config class, no singleton