import { useState, useEffect } from 'react';
import { toolRegistry, fetch as fetchTools, workflow as workflowTools, filesystem as filesystemTools } from '../../../tools/index.js';

interface UseToolRegistrationReturn {
  isConnected: boolean;
  isRegistering: boolean;
  error: Error | null;
}

export const useToolRegistration = (): UseToolRegistrationReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const registerTools = async () => {
      try {
        setIsRegistering(true);
        await toolRegistry.autoRegister(fetchTools);
        await toolRegistry.autoRegister(workflowTools);
        await toolRegistry.autoRegister(filesystemTools);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setIsConnected(false);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsRegistering(false);
      }
    };

    registerTools();
  }, []);

  return {
    isConnected,
    isRegistering,
    error,
  };
};