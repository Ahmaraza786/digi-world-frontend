import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import StatCard from '../dashboard/components/StatCard';
import { useApi } from '../hooks/useApi';

// ✅ Stable empty array
const EMPTY_ARRAY = Object.freeze([]);

// ✅ Memoized StatCard with Loading State
const MemoizedStatCard = React.memo(
  function MemoizedStatCard({ title, value, interval, trend, data, loading, onClick }) {
    return (
      <Box sx={{ position: 'relative' }}>
        <StatCard
          title={title}
          value={value}
          interval={interval}
          trend={trend}
          data={data}
          onClick={onClick}
        />
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(2px)',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Skeleton
              variant="rounded"
              width="100%"
              height="100%"
              sx={{ transform: 'none' }}
            />
          </Box>
        )}
      </Box>
    );
  },
  (prev, next) =>
    prev.title === next.title &&
    prev.value === next.value &&
    prev.interval === next.interval &&
    prev.trend === next.trend &&
    prev.data === next.data &&
    prev.loading === next.loading &&
    prev.onClick === next.onClick
);

// ✅ Memoized DashboardCards
const DashboardCards = React.memo(function DashboardCards(props) {

  const {
    loading,
    invoicesTotal,
    invoicesPaid,
    invoicesUnpaid,
    poReceived,
    poPending,
    amountReceived,
    amountPending,
    expensesAmount,
    salariesAmount,
    withholdingTaxAmount,
    totalGSTAmount,
    totalActualCost,
    onTotalInvoicesClick,
    onPaidInvoicesClick,
    onUnpaidInvoicesClick,
    onPOReceivedClick,
    onPOPendingClick,
  } = props;

  return (
    <Grid container spacing={2} columns={12} sx={{ mb: 2 }}>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Total Invoices (range)"
          value={String(invoicesTotal)}
          interval="Selected range"
          trend="neutral"
          data={EMPTY_ARRAY}
          loading={loading}
          onClick={onTotalInvoicesClick}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Paid invoices"
          value={String(invoicesPaid)}
          interval="Selected range"
          trend="up"
          data={EMPTY_ARRAY}
          loading={loading}
          onClick={onPaidInvoicesClick}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Unpaid invoices"
          value={String(invoicesUnpaid)}
          interval="Selected range"
          trend="down"
          data={EMPTY_ARRAY}
          loading={loading}
          onClick={onUnpaidInvoicesClick}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="PO Received"
          value={String(poReceived)}
          interval="Selected range"
          trend="up"
          data={EMPTY_ARRAY}
          loading={loading}
          onClick={onPOReceivedClick}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="PO Pending"
          value={String(poPending)}
          interval="Selected range"
          trend="down"
          data={EMPTY_ARRAY}
          loading={loading}
          onClick={onPOPendingClick}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Amount Received"
          value={`Rs ${Number(amountReceived).toLocaleString()}`}
          interval="Selected range"
          trend="up"
          data={EMPTY_ARRAY}
          loading={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Amount Pending"
          value={`Rs ${Number(amountPending).toLocaleString()}`}
          interval="Selected range"
          trend="down"
          data={EMPTY_ARRAY}
          loading={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Expenses Amount"
          value={`PKR ${expensesAmount.toLocaleString()}`}
          interval="Selected range"
          trend="neutral"
          data={EMPTY_ARRAY}
          loading={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Total Salaries"
          value={`PKR ${salariesAmount.toLocaleString()}`}
          interval="Selected range"
          trend="neutral"
          data={EMPTY_ARRAY}
          loading={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Withholding Tax"
          value={`PKR ${Number(withholdingTaxAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          interval="Selected range"
          trend="neutral"
          data={EMPTY_ARRAY}
          loading={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Total GST"
          value={`PKR ${Number(totalGSTAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          interval="Selected range"
          trend="neutral"
          data={EMPTY_ARRAY}
          loading={loading}
        />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <MemoizedStatCard
          title="Total Actual Cost (PO)"
          value={`PKR ${Number(totalActualCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          interval="Selected range"
          trend="neutral"
          data={EMPTY_ARRAY}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
}, areCardsEqual);

function areCardsEqual(prev, next) {
  return (
    prev.loading === next.loading &&
    prev.invoicesTotal === next.invoicesTotal &&
    prev.invoicesPaid === next.invoicesPaid &&
    prev.invoicesUnpaid === next.invoicesUnpaid &&
    prev.poReceived === next.poReceived &&
    prev.poPending === next.poPending &&
    prev.amountReceived === next.amountReceived &&
    prev.amountPending === next.amountPending &&
    prev.expensesAmount === next.expensesAmount &&
    prev.salariesAmount === next.salariesAmount &&
    prev.withholdingTaxAmount === next.withholdingTaxAmount &&
    prev.totalGSTAmount === next.totalGSTAmount &&
    prev.totalActualCost === next.totalActualCost &&
    prev.onTotalInvoicesClick === next.onTotalInvoicesClick &&
    prev.onPaidInvoicesClick === next.onPaidInvoicesClick &&
    prev.onUnpaidInvoicesClick === next.onUnpaidInvoicesClick &&
    prev.onPOReceivedClick === next.onPOReceivedClick &&
    prev.onPOPendingClick === next.onPOPendingClick
  );
}

// ✅ Memoized DateRangeControls
const DateRangeControls = React.memo(function DateRangeControls({
  tempDateRange,
  onChange,
  handleApply,
  isApplying,
}) {

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mb: 3, alignItems: 'center' }}
    >
      <TextField
        label="Start Date"
        type="date"
        value={tempDateRange.startDate}
        onChange={(e) => onChange('startDate', e.target.value)}
        size="small"
        InputLabelProps={{ shrink: true }}
        inputProps={{ max: tempDateRange.endDate }}
        sx={{ minWidth: 180 }}
      />

      <Typography
        sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary' }}
      >
        to
      </Typography>

      <TextField
        label="End Date"
        type="date"
        value={tempDateRange.endDate}
        onChange={(e) => onChange('endDate', e.target.value)}
        size="small"
        InputLabelProps={{ shrink: true }}
        inputProps={{ min: tempDateRange.startDate }}
        sx={{ minWidth: 180 }}
      />

      <Button
        variant="contained"
        size="medium"
        onClick={handleApply}
        disabled={
          !tempDateRange.startDate || !tempDateRange.endDate || isApplying
        }
      >
        Apply
      </Button>
    </Stack>
  );
});

// Helper
function selectCardValues(summary) {
  return {
    invoicesTotal: summary?.invoices?.total ?? 0,
    invoicesPaid: summary?.invoices?.paid ?? 0,
    invoicesUnpaid: summary?.invoices?.unpaid ?? 0,
    poReceived: summary?.purchaseOrders?.received ?? 0,
    poPending: summary?.purchaseOrders?.pending ?? 0,
    amountReceived: summary?.amounts?.purchaseOrders?.received ?? 0,
    amountPending: summary?.amounts?.purchaseOrders?.pending ?? 0,
    expensesAmount: summary?.expenses?.amount ?? 0,
    salariesAmount: summary?.salaries?.amount ?? 0,
    withholdingTaxAmount: summary?.withholdingTax?.amount ?? 0,
    totalGSTAmount: summary?.totalGST?.amount ?? 0,
    totalActualCost: summary?.totalActualCost?.amount ?? 0,
  };
}

const DashboardHome = () => {
  const { get } = useApi();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [summary, setSummary] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [isApplying] = React.useTransition();

  const [appliedDateRange, setAppliedDateRange] = React.useState(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // First day of current month (1st day)
    const firstDay = new Date(currentYear, currentMonth, 1);
    
    // Last day of current month (using next month's day 0)
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Format dates in YYYY-MM-DD format without timezone conversion
    const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
    const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    
    return {
      startDate,
      endDate,
    };
  });

  const [tempDateRange, setTempDateRange] = React.useState(() => ({
    startDate: appliedDateRange.startDate,
    endDate: appliedDateRange.endDate,
  }));

  const appliedRangeRef = React.useRef(appliedDateRange);
  React.useEffect(() => {
    appliedRangeRef.current = appliedDateRange;
  }, [appliedDateRange]);

  const handleTempChange = React.useCallback((field, value) => {
    setTempDateRange((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleApply = React.useCallback(() => {
    const prev = appliedRangeRef.current;
    if (
      tempDateRange.startDate === prev.startDate &&
      tempDateRange.endDate === prev.endDate
    ) {
      return;
    }
    setAppliedDateRange({
      startDate: tempDateRange.startDate,
      endDate: tempDateRange.endDate,
    });
  }, [tempDateRange.startDate, tempDateRange.endDate]);

  const fetchSummary = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (appliedDateRange.startDate)
        params.append('startDate', appliedDateRange.startDate);
      if (appliedDateRange.endDate)
        params.append('endDate', appliedDateRange.endDate);
      
      // Fetch dashboard summary and total actual cost in parallel
      const [summaryData, actualCostData] = await Promise.all([
        get(`/api/dashboard/summary?${params.toString()}`),
        get(`/api/purchase-orders/total-actual-cost?${params.toString()}`)
      ]);
      
      // Merge the actual cost into the summary
      const mergedData = {
        ...summaryData,
        totalActualCost: {
          amount: actualCostData?.totalActualCost || 0
        }
      };
      
      setSummary((prev) =>
        JSON.stringify(prev) === JSON.stringify(mergedData) ? prev : mergedData
      );
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      setError('Failed to load dashboard data. Please try again.');
      // Set default empty summary on error to prevent crashes
      setSummary({
        range: { startDate: appliedDateRange.startDate, endDate: appliedDateRange.endDate },
        invoices: { total: 0, paid: 0, unpaid: 0 },
        purchaseOrders: { received: 0, pending: 0 },
        amounts: { purchaseOrders: { received: 0, pending: 0 } },
        expenses: { amount: 0 },
        salaries: { amount: 0 },
        totalActualCost: { amount: 0 }
      });
    } finally {
      setLoading(false);
    }
  }, [get, appliedDateRange.startDate, appliedDateRange.endDate]);

  React.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const cardValues = React.useMemo(() => selectCardValues(summary), [summary]);

  // Click handlers for invoice cards
  const handleTotalInvoicesClick = React.useCallback(() => {
    // Navigate to invoices page with date range filter
    const params = new URLSearchParams();
    params.append('startDate', appliedDateRange.startDate);
    params.append('endDate', appliedDateRange.endDate);
    navigate(`/invoices?${params.toString()}`);
  }, [navigate, appliedDateRange]);

  const handlePaidInvoicesClick = React.useCallback(() => {
    // Navigate to invoices page with date range filter and status=paid
    const params = new URLSearchParams();
    params.append('startDate', appliedDateRange.startDate);
    params.append('endDate', appliedDateRange.endDate);
    params.append('status', 'paid');
    navigate(`/invoices?${params.toString()}`);
  }, [navigate, appliedDateRange]);

  const handleUnpaidInvoicesClick = React.useCallback(() => {
    // Navigate to invoices page with date range filter and status=unpaid
    const params = new URLSearchParams();
    params.append('startDate', appliedDateRange.startDate);
    params.append('endDate', appliedDateRange.endDate);
    params.append('status', 'unpaid');
    navigate(`/invoices?${params.toString()}`);
  }, [navigate, appliedDateRange]);

  const handlePOReceivedClick = React.useCallback(() => {
    // Navigate to purchase orders page with date range filter and status=delivered
    const params = new URLSearchParams();
    params.append('startDate', appliedDateRange.startDate);
    params.append('endDate', appliedDateRange.endDate);
    params.append('status', 'delivered');
    navigate(`/purchase-orders?${params.toString()}`);
  }, [navigate, appliedDateRange]);

  const handlePOPendingClick = React.useCallback(() => {
    // Navigate to purchase orders page with date range filter and status=pending
    const params = new URLSearchParams();
    params.append('startDate', appliedDateRange.startDate);
    params.append('endDate', appliedDateRange.endDate);
    params.append('status', 'pending');
    navigate(`/purchase-orders?${params.toString()}`);
  }, [navigate, appliedDateRange]);

  const handleExpensesClick = React.useCallback(() => {
    // Navigate to salary management page
    navigate('/salary-management');
  }, [navigate]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography component="h2" variant="h6" sx={{ mb: 2 }}>
        Dashboard Overview
      </Typography>

      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={fetchSummary}
            disabled={loading}
          >
            Retry
          </Button>
        </Box>
      )}

      <DateRangeControls
        tempDateRange={tempDateRange}
        onChange={handleTempChange}
        handleApply={handleApply}
        isApplying={isApplying}
      />

      <DashboardCards 
        loading={loading} 
        {...cardValues}
        onTotalInvoicesClick={handleTotalInvoicesClick}
        onPaidInvoicesClick={handlePaidInvoicesClick}
        onUnpaidInvoicesClick={handleUnpaidInvoicesClick}
        onPOReceivedClick={handlePOReceivedClick}
        onPOPendingClick={handlePOPendingClick}
      />
    </Box>
  );
};

export default DashboardHome;