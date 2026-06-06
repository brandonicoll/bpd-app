import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkSubscriptionStatus } from '../services/purchases';

// ─── Beta mode ────────────────────────────────────────────────────────────────
// Set to true during beta testing so testers get full app access
// without needing sandbox IAP accounts.
// IMPORTANT: Set this to false before submitting to the App Store.
const BETA_MODE = true;

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (BETA_MODE) {
      // In beta mode, everyone gets full access
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
