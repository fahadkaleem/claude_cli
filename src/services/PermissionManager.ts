import type { PermissionRequestData } from '../tools/core/types.js';

type PermissionResponse = {
  approved: boolean;
  permanent: boolean;
};

export class PermissionManager {
  private pendingPermissions: Map<string, {
    resolve: (response: PermissionResponse) => void;
    data: PermissionRequestData;
  }> = new Map();

  async requestPermission(
    toolId: string,
    data: PermissionRequestData
  ): Promise<PermissionResponse> {
    return new Promise((resolve) => {
      this.pendingPermissions.set(toolId, { resolve, data });

      // Notify UI about pending permission
      if (typeof (globalThis as any).__setUIPendingPermission === 'function') {
        (globalThis as any).__setUIPendingPermission(toolId, data);
      }
    });
  }

  respondToPermission(toolId: string, approved: boolean, permanent: boolean): void {
    const pending = this.pendingPermissions.get(toolId);
    if (pending) {
      pending.resolve({ approved, permanent });
      this.pendingPermissions.delete(toolId);
    }
  }

  getPendingPermission(toolId: string): PermissionRequestData | undefined {
    return this.pendingPermissions.get(toolId)?.data;
  }

  hasPendingPermission(toolId: string): boolean {
    return this.pendingPermissions.has(toolId);
  }
}

export const permissionManager = new PermissionManager();