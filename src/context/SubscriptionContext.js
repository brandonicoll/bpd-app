import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkSubscriptionStatus } from '../services/purchases';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const active = await checkSubscriptionStatus();
    setIsSubscribed(active);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, isLoading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
}
