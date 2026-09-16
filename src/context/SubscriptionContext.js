import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkSubscriptionStatus } from '../services/purchases';

const SubscriptionContext = createContext(null);

// Beta build: bypasses the paywall for TestFlight testers. Must be set back
// to false before the app is submitted for full release.
const BETA_MODE = true;

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (BETA_MODE) {
      setIsSubscribed(true);
      setIsLoading(false);
      return;
    }
    try {
      const active = await checkSubscriptionStatus();
      setIsSubscribed(active);
    } catch (e) {
      console.error('SubscriptionContext refresh error:', e);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
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
