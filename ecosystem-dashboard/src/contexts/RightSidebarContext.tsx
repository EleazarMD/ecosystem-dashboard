import React, { createContext, useState, useContext, ReactNode } from 'react';

interface RightSidebarContextType {
  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
  setRightSidebarOpen: (isOpen: boolean) => void;
  rightSidebarWidth: number;
  setRightSidebarWidth: (width: number) => void;
}

const RightSidebarContext = createContext<RightSidebarContextType | undefined>(undefined);

export const RightSidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [rightSidebarWidth, setRightSidebarWidthState] = useState(350);

  const setRightSidebarWidth = (width: number) => {
    const minWidth = 300;
    const maxWidth = 800;
    if (width >= minWidth && width <= maxWidth) {
      setRightSidebarWidthState(width);
    }
  };

  const toggleRightSidebar = () => {
    setRightSidebarOpen(prev => !prev);
  };

  return (
    <RightSidebarContext.Provider value={{ isRightSidebarOpen, toggleRightSidebar, setRightSidebarOpen, rightSidebarWidth, setRightSidebarWidth }}>
      {children}
    </RightSidebarContext.Provider>
  );
};

export const useRightSidebar = () => {
  const context = useContext(RightSidebarContext);
  if (context === undefined) {
    throw new Error('useRightSidebar must be used within a RightSidebarProvider');
  }
  return context;
};
