import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWeightUnit, saveWeightUnit } from '../services/storage';

const WeightUnitContext = createContext(null);

export function WeightUnitProvider({ children }) {
  const [weightUnit, setWeightUnitState] = useState('lbs');

  useEffect(() => {
    getWeightUnit().then(setWeightUnitState);
  }, []);

  const setWeightUnit = useCallback(async (unit) => {
    setWeightUnitState(unit);
    await saveWeightUnit(unit);
  }, []);

  return (
    <WeightUnitContext.Provider value={{ weightUnit, setWeightUnit }}>
      {children}
    </WeightUnitContext.Provider>
  );
}

export function useWeightUnit() {
  const ctx = useContext(WeightUnitContext);
  if (!ctx) return { weightUnit: 'lbs', setWeightUnit: async () => {} };
  return ctx;
}
