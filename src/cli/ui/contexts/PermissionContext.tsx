import React, { createContext, useContext, useState, useEffect } from 'react';
import { permissionManager } from '../../../services/PermissionManager.js';
import type { PermissionRequestData } from '../../../tools/core/types.js';

interface PendingPermission {
  toolId: string;
  data: PermissionRequestData;
}

interface PermissionContextType {
  pendingPermission: PendingPermission | null;
  approvePermission: (permanent: boolean) => void;
  rejectPermission: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);

  // Poll for pending permissions
  useEffect(() => {
    const interval = setInterval(() => {
      // Check if there's a new pending permission
      // This is a simple approach - in a real app you'd use events
      // For now we'll just check manually when permissions are requested
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const approvePermission = (permanent: boolean) => {
    if (pendingPermission) {
      permissionManager.respondToPermission(pendingPermission.toolId, true, permanent);
      setPendingPermission(null);
    }
  };

  const rejectPermission = () => {
    if (pendingPermission) {
      permissionManager.respondToPermission(pendingPermission.toolId, false, false);
      setPendingPermission(null);
    }
  };

  // Expose a way to set pending permissions
  // This will be called by the permission manager
  (globalThis as any).__setUIPendingPermission = (toolId: string, data: PermissionRequestData) => {
    setPendingPermission({ toolId, data });
  };

  return (
    <PermissionContext.Provider value={{ pendingPermission, approvePermission, rejectPermission }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within PermissionProvider');
  }
  return context;
};