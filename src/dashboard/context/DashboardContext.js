import React from 'react';
import { useApi } from '../../hooks/useApi';

// Split contexts so consumers only re-render for what they use
export const RangeContext = React.createContext(null);
export const LoadingContext = React.createContext(null);
export const SummaryContext = React.createContext(null);

export function DashboardProvider({ children }) {
  const { get } = useApi();

  // Loading state
  const [loading, setLoading] = React.useState(true);

  // Summary data
  const [summary, setSummary] = React.useState(null);

  // Transition state
  const [isApplying, startTransition] = React.useTransition();

  // Applied date range (triggers API call)
  const [appliedDateRange, setAppliedDateRange] = React.useState(() => ({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  }));

  // Temporary date range (for user selection before applying)
  const [tempDateRange, setTempDateRange] = React.useState(() => ({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  }));

  const fetchSummary = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedDateRange.startDate) params.append('startDate', appliedDateRange.startDate);
      if (appliedDateRange.endDate) params.append('endDate', appliedDateRange.endDate);
      const data = await get(`/api/dashboard/summary?${params.toString()}`);
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, [get, appliedDateRange.startDate, appliedDateRange.endDate]);

  React.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleApply = React.useCallback(() => {
    if (
      tempDateRange.startDate === appliedDateRange.startDate &&
      tempDateRange.endDate === appliedDateRange.endDate
    ) {
      return;
    }
    startTransition(() => {
      setAppliedDateRange({
        startDate: tempDateRange.startDate,
        endDate: tempDateRange.endDate
      });
    });
  }, [tempDateRange, appliedDateRange.startDate, appliedDateRange.endDate]);

  const rangeValue = React.useMemo(() => ({
    tempDateRange,
    setTempDateRange,
    appliedDateRange,
    handleApply,
    isApplying
  }), [tempDateRange, appliedDateRange, handleApply, isApplying]);

  const loadingValue = React.useMemo(() => ({ loading }), [loading]);
  const summaryValue = React.useMemo(() => ({ summary }), [summary]);

  return (
    <RangeContext.Provider value={rangeValue}>
      <LoadingContext.Provider value={loadingValue}>
        <SummaryContext.Provider value={summaryValue}>
          {children}
        </SummaryContext.Provider>
      </LoadingContext.Provider>
    </RangeContext.Provider>
  );
}


