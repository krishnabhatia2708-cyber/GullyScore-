import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Page } from '../types';
import { useAuth } from './AuthContext';

interface AppContextType {
  currentPage: Page;
  navigate: (page: Page, params?: Record<string, string>) => void;
  goBack: () => boolean;
  canGoBack: boolean;
  params: Record<string, string>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    // Initialize with saved state or default
    try {
      const saved = localStorage.getItem('gullyscore_page') as Page | null;
      if (saved) return saved;
    } catch {
      return 'landing';
    }
    return 'landing';
  });

  const [params, setParams] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('gullyscore_params');
      if (saved) return JSON.parse(saved);
    } catch {
      return {};
    }
    return {};
  });

  const [history, setHistory] = useState<Page[]>([]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gullyscore_page', currentPage);
      localStorage.setItem('gullyscore_params', JSON.stringify(params));
    } catch {
      // Local storage can be unavailable in private browsing modes.
    }
  }, [currentPage, params]);

  const navigate = useCallback((page: Page, newParams?: Record<string, string>) => {
    setHistory(prev => [...prev, currentPage]);
    setCurrentPage(page);
    setParams(newParams ?? {});
    window.scrollTo(0, 0);
  }, [currentPage]);

  const goBack = useCallback((): boolean => {
    if (history.length === 0) {
      setCurrentPage(user ? 'dashboard' : 'landing');
      setParams({});
      return false;
    }
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrentPage(prev);
    setParams({});
    return true;
  }, [history, user]);

  return (
    <AppContext.Provider value={{
      currentPage, navigate, goBack,
      canGoBack: history.length > 0, params
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
