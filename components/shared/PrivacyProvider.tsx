'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type PrivacyContextType = {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
};

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hideAmounts, setHideAmounts] = useState(false);

  // Cargar preferencia del localStorage
  useEffect(() => {
    const stored = localStorage.getItem('hide-amounts');
    if (stored === 'true') {
      setHideAmounts(true);
    }
  }, []);

  const toggleHideAmounts = () => {
    setHideAmounts((prev) => {
      const newValue = !prev;
      localStorage.setItem('hide-amounts', newValue.toString());
      return newValue;
    });
  };

  return (
    <PrivacyContext.Provider value={{ hideAmounts, toggleHideAmounts }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within PrivacyProvider');
  }
  return context;
}
