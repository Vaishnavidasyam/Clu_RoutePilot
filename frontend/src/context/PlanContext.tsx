import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlanDetail, Customer, Executive, ValidationReport } from '../types';
import { planningService, dataService } from '../services/api';
import { useOperationalDate } from './DateTimeContext';

interface PlanContextType {
  // Master plan & data state
  currentPlan: PlanDetail | null;
  todayData: {
    customer_count: number;
    executive_count: number;
    ptp_count: number;
    customers: Customer[];
    executives: Executive[];
    source?: string;
    status?: string;
  } | null;
  validationReport: ValidationReport | null;
  loading: boolean;
  refreshing: boolean;

  // Actions
  refreshAll: (targetDate?: string) => Promise<void>;
  publishPlan: (planId: number) => Promise<boolean>;
  replanRoutes: (params?: any) => Promise<any>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { operationalDate, currentDate } = useOperationalDate();
  const [currentPlan, setCurrentPlan] = useState<PlanDetail | null>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const refreshAll = useCallback(async (targetDate?: string) => {
    setRefreshing(true);
    const dateToFetch = targetDate || operationalDate;
    try {
      // 1. Fetch Today's / Operational Date master data
      const dataRes = await dataService.getTodayData(dateToFetch);
      if (dataRes.data) {
        setTodayData(dataRes.data);
      }

      // 2. Fetch Plan matching the operational date
      const plansRes = await planningService.listPlans(dateToFetch);
      if (plansRes.data && plansRes.data.length > 0) {
        const matchingId = plansRes.data[0].id;
        const detail = await planningService.getPlan(matchingId);
        setCurrentPlan(detail);
      } else {
        // If viewing today and no plan exists for today yet, check fallback to latest plan or null
        if (dateToFetch === currentDate) {
          const allPlans = await planningService.listPlans();
          if (allPlans.data && allPlans.data.length > 0 && allPlans.data[0].plan_date === currentDate) {
            const detail = await planningService.getPlan(allPlans.data[0].id);
            setCurrentPlan(detail);
          } else {
            setCurrentPlan(null);
          }
        } else {
          setCurrentPlan(null);
        }
      }

      // 3. Fetch validation report
      const valRes = await dataService.getValidation(dateToFetch);
      if (valRes) {
        setValidationReport(valRes);
      }
    } catch (e) {
      console.error('PlanContext refresh error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [operationalDate, currentDate]);

  useEffect(() => {
    refreshAll(operationalDate);
  }, [operationalDate, refreshAll]);

  const publishPlan = async (planId: number): Promise<boolean> => {
    try {
      const res = await planningService.publish(planId);
      if (res.success) {
        await refreshAll();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error publishing plan', e);
      return false;
    }
  };

  const replanRoutes = async (params: any = {}) => {
    if (!currentPlan) return;
    try {
      const res = await planningService.reoptimize(currentPlan.id, params);
      await refreshAll();
      return res;
    } catch (e) {
      console.error('Error re-optimizing plan', e);
      throw e;
    }
  };

  return (
    <PlanContext.Provider
      value={{
        currentPlan,
        todayData,
        validationReport,
        loading,
        refreshing,
        refreshAll,
        publishPlan,
        replanRoutes
      }}
    >
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};
