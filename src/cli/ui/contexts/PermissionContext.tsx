import React, { createContext, useContext, useState, useEffect } from 'react';
import { useConfig } from './ConfigContext.js';
import type { PermissionRequestData } from '../../../tools/core/types.js';
import type { ToolCallConfirmationDetails, ToolConfirmationOutcome } from '../../../core/permissions/types.js';

interface PendingPermission {
  toolId: string;
  data: PermissionRequestData;
}

interface PendingConfirmation {
  confirmationId: string;
  details: ToolCallConfirmationDetails;
}

interface PermissionContextType {
  pendingPermission: PendingPermission | null;
  pendingConfirmation: PendingConfirmation | null;
  approvePermission: (permanent: boolean) => void;
  rejectPermission: () => void;
  respondToConfirmation: (outcome: ToolConfirmationOutcome) => void;
  requestPermission: (toolId: string, data: PermissionRequestData) => Promise<boolean>;
  requestConfirmation: (details: ToolCallConfirmationDetails) => Promise<ToolConfirmationOutcome>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const config = useConfig();
  const permissionManager = config.getPermissionManager();
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  useEffect(() => {
    const handlePermissionRequested = (toolId: string, data: PermissionRequestData) => {
      setPendingPermission({ toolId, data });
    };

    const handleConfirmationRequested = (confirmationId: string, details: ToolCallConfirmationDetails) => {
      setPendingConfirmation({ confirmationId, details });
    };

    permissionManager.on('permission-requested', handlePermissionRequested);
    permissionManager.on('confirmation-requested', handleConfirmationRequested);

    return () => {
      permissionManager.off('permission-requested', handlePermissionRequested);
      permissionManager.off('confirmation-requested', handleConfirmationRequested);
    };
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

  const respondToConfirmation = (outcome: ToolConfirmationOutcome) => {
    if (pendingConfirmation) {
      permissionManager.respondToConfirmation(pendingConfirmation.confirmationId, outcome);
      setPendingConfirmation(null);
    }
  };

  // Wrapper functions for toolExecutor
  const requestPermission = async (toolId: string, data: PermissionRequestData): Promise<boolean> => {
    const response = await permissionManager.requestPermission(toolId, data);
    return response.approved;
  };

  const requestConfirmation = async (details: ToolCallConfirmationDetails): Promise<ToolConfirmationOutcome> => {
    const confirmationId = `confirmation_${Date.now()}`;
    return permissionManager.requestConfirmation(confirmationId, details);
  };

  return (
    <PermissionContext.Provider value={{
      pendingPermission,
      pendingConfirmation,
      approvePermission,
      rejectPermission,
      respondToConfirmation,
      requestPermission,
      requestConfirmation
    }}>
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