import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../services/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProgram, setCurrentProgram] = useState(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    try {
      const value = await AsyncStorage.getItem(KEYS.HAS_COMPLETED_ONBOARDING);
      const program = await AsyncStorage.getItem(KEYS.CURRENT_PROGRAM);
      setHasCompletedOnboarding(value === 'true');
      setCurrentProgram(program ? JSON.parse(program) : null);
    } catch (e) {
      console.error('Error loading app state:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function completeOnboarding(programData) {
    await AsyncStorage.setItem(KEYS.HAS_COMPLETED_ONBOARDING, 'true');
    await AsyncStorage.setItem(KEYS.CURRENT_PROGRAM, JSON.stringify(programData));
    setCurrentProgram(programData);
    setHasCompletedOnboarding(true);
  }

  return (
    <AppContext.Provider value={{
      hasCompletedOnboarding,
      isLoading,
      currentProgram,
      setCurrentProgram,
      completeOnboarding,
      refreshProgram: checkOnboardingStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
