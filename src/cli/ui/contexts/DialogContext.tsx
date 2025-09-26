import React, { createContext, useContext, useState, ReactNode } from 'react';

type DialogType = 'help' | 'settings' | 'about' | 'model' | 'theme-select' | null;

interface DialogContextType {
  currentDialog: DialogType;
  openDialog: (dialog: DialogType) => void;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentDialog, setCurrentDialog] = useState<DialogType>(null);

  const openDialog = (dialog: DialogType) => {
    setCurrentDialog(dialog);
  };

  const closeDialog = () => {
    setCurrentDialog(null);
  };

  return (
    <DialogContext.Provider value={{ currentDialog, openDialog, closeDialog }}>
      {children}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
};