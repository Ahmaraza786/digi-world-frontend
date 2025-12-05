import * as React from 'react';
import {
  Alert,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../auth/AuthContext';
import ReusableDataTable from '../components/ReusableData';
import PageContainer from '../components/PageContainer';
import { useApi } from '../hooks/useApi';
import { Add, Delete, Edit, Search, Clear, Visibility, Save, CheckCircle } from '@mui/icons-material';

const INITIAL_PAGE_SIZE = 10;

export default function SalaryManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, hasPermission, token } = useAuth();
  
  // Check user permissions
  const canRead = user?.permissions?.employee_salary?.includes('read') || false;
  const canCreate = user?.permissions?.employee_salary?.includes('create') || false;
  const canUpdate = user?.permissions?.employee_salary?.includes('update') || false;
  const canDelete = user?.permissions?.employee_salary?.includes('delete') || false;

  const { get, post, put, del } = useApi();

  const [rowsState, setRowsState] = React.useState({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  // Month/Year selection state
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [salariesGenerated, setSalariesGenerated] = React.useState(false);
  const [isFinalized, setIsFinalized] = React.useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedSalary, setSelectedSalary] = React.useState(null);
  
  // Add new employee salary modal state
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = React.useState(false);
  const [availableEmployees, setAvailableEmployees] = React.useState([]);
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [newSalaryData, setNewSalaryData] = React.useState({
    basic_salary: '',
    bonus: '',
    deductions: ''
  });

  // Expenses modal state
  const [expensesModalOpen, setExpensesModalOpen] = React.useState(false);
  const [expenses, setExpenses] = React.useState([]);
  const [expensesSummary, setExpensesSummary] = React.useState({ totalAmount: 0, count: 0 });
  const [newExpense, setNewExpense] = React.useState({
    description: '',
    amount: ''
  });
  const [editingExpense, setEditingExpense] = React.useState(null);

  // Search state
  const [searchState, setSearchState] = React.useState({
    search: '',
    is_finalized: '',
    isActive: false,
  });

  // Table state management
  const [paginationModel, setPaginationModel] = React.useState({
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 0,
    pageSize: searchParams.get('pageSize')
      ? Number(searchParams.get('pageSize'))
      : INITIAL_PAGE_SIZE,
  });

  const [filterModel, setFilterModel] = React.useState(
    searchParams.get('filter')
      ? JSON.parse(searchParams.get('filter') ?? '')
      : { items: [] },
  );

  const [sortModel, setSortModel] = React.useState(
    searchParams.get('sort') ? JSON.parse(searchParams.get('sort') ?? '') : [],
  );

  // Check if user has read permission on mount
  React.useEffect(() => {
    if (!canRead) {
      setError('You do not have permission to view this page');
      toast.error('You do not have permission to view this page', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [canRead, navigate]);

  // URL state synchronization
  const handlePaginationModelChange = React.useCallback(
    (model) => {
      setPaginationModel(model);
      searchParams.set('page', String(model.page));
      searchParams.set('pageSize', String(model.pageSize));
      const newSearchParamsString = searchParams.toString();
      navigate(
        `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
      );
    },
    [navigate, pathname, searchParams],
  );

  const handleFilterModelChange = React.useCallback(
    (model) => {
      setFilterModel(model);
      if (
        model.items.length > 0 ||
        (model.quickFilterValues && model.quickFilterValues.length > 0)
      ) {
        searchParams.set('filter', JSON.stringify(model));
      } else {
        searchParams.delete('filter');
      }
      const newSearchParamsString = searchParams.toString();
      navigate(
        `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
      );
    },
    [navigate, pathname, searchParams],
  );

  const handleSortModelChange = React.useCallback(
    (model) => {
      setSortModel(model);
      if (model.length > 0) {
        searchParams.set('sort', JSON.stringify(model));
      } else {
        searchParams.delete('sort');
      }
      const newSearchParamsString = searchParams.toString();
      navigate(
        `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
      );
    },
    [navigate, pathname, searchParams],
  );

  // Generate salaries for selected month/year
  const handleGenerateSalaries = async () => {
    if (!canCreate) return;
    
    setIsLoading(true);
    try {
      const response = await post('/api/employee-salaries/generate', {
        month: selectedMonth,
        year: selectedYear
      });

      toast.success(`Generated ${response.count} salary entries for ${selectedMonth}/${selectedYear}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      setSalariesGenerated(true);
      loadSalaries();
      // Load expenses after salaries are generated
      setTimeout(() => {
        loadExpenses();
      }, 100);
    } catch (error) {
      console.log('Salary generation error:', error.response?.data?.error);
      console.log('Full error object:', error);
      
      if (error.response?.data?.error?.includes('already exist')) {
        toast.info('Salaries for this month already exist. Loading existing data...', {
          position: "top-right",
          autoClose: 3000,
        });
        setSalariesGenerated(true);
        loadSalaries();
      } else if (error.response?.data?.error?.includes('No active employees found who were employed during this month/year') || 
                 error.response?.data?.error?.includes('No active employees found')) {
        toast.warning('No employees were employed during this month/year. Please check employee joining dates.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        const errorMessage = error.response?.data?.error || 'Failed to generate salaries';
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load salaries for selected month/year
  const loadSalaries = React.useCallback(async () => {
    if (!canRead) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      
      let apiUrl = `/api/employee-salaries?page=${page}&size=${pageSize}`;
      
      // Add search parameters
      const params = new URLSearchParams();
      
      params.append('month', selectedMonth);
      params.append('year', selectedYear);
      
      if (searchState.search?.trim()) {
        params.append('search', searchState.search.trim());
      }
      
      if (searchState.is_finalized?.trim()) {
        params.append('is_finalized', searchState.is_finalized.trim());
      }
      
      if (params.toString()) {
        apiUrl += `&${params.toString()}`;
      }
      
      const response = await get(apiUrl);
      
      if (response.content && Array.isArray(response.content)) {
        setRowsState({
          rows: response.content,
          rowCount: response.totalElements || response.content.length,
        });
        
        // Check if any salaries are finalized
        const hasFinalized = response.content.some(salary => salary.is_finalized);
        setIsFinalized(hasFinalized);
      } else if (Array.isArray(response)) {
        setRowsState({
          rows: response,
          rowCount: response.length,
        });
        
        const hasFinalized = response.some(salary => salary.is_finalized);
        setIsFinalized(hasFinalized);
      } else {
        setRowsState({
          rows: [],
          rowCount: 0,
        });
        setIsFinalized(false);
      }
      
    } catch (loadError) {
      console.error('Error loading salaries:', loadError);
      setError(loadError.message || 'Failed to load salaries');
      toast.error('Failed to load salaries', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead, selectedMonth, selectedYear, searchState.search, searchState.is_finalized]);

  // Load data effect
  React.useEffect(() => {
    if (salariesGenerated) {
      loadSalaries();
      loadExpenses();
    }
  }, [paginationModel, loadSalaries, salariesGenerated, selectedMonth, selectedYear]);

  // Load expenses when month/year changes (even if salaries not generated)
  React.useEffect(() => {
    loadExpenses();
  }, [selectedMonth, selectedYear]);

  // Update salary entry (marks finalized salaries as needing re-finalization)
  const handleUpdateSalary = async (salaryId, field, value) => {
    if (!canUpdate) return;
    
    try {
      const salary = rowsState.rows.find(s => s.id === salaryId);
      if (!salary) return;

      const updateData = {
        basic_salary: field === 'basic_salary' ? parseFloat(value) : salary.basic_salary,
        bonus: field === 'bonus' ? parseFloat(value) : salary.bonus,
        deductions: field === 'deductions' ? parseFloat(value) : salary.deductions,
        // If editing a finalized salary, mark it as pending (needs re-finalization)
        is_finalized: salary.is_finalized ? false : false
      };

      await put(`/api/employee-salaries/${salaryId}`, updateData);

      // Update local state
      setRowsState(prev => ({
        ...prev,
        rows: prev.rows.map(s => 
          s.id === salaryId 
            ? { 
                ...s, 
                ...updateData,
                net_salary: updateData.basic_salary + updateData.bonus - updateData.deductions
              }
            : s
        )
      }));

      const statusMessage = salary.is_finalized 
        ? 'Salary updated. Click "Re-Finalize" to apply changes.' 
        : 'Salary updated successfully';
      
      toast.warning(statusMessage, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update salary';
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Finalize or Re-finalize salaries
  const handleFinalizeSalaries = async () => {
    if (!canUpdate) return;
    
    setIsLoading(true);
    try {
      const response = await post('/api/employee-salaries/finalize', {
        month: selectedMonth,
        year: selectedYear
      });

      // Display the message from backend with finalization details
      toast.success(response.message || `Finalized salaries for ${selectedMonth}/${selectedYear}`, {
        position: "top-right",
        autoClose: 4000,
      });

      setIsFinalized(true);
      loadSalaries();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to finalize salaries';
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit salary
  const handleEditSalary = (salary) => {
    // Store as strings to allow clearing the field
    setSelectedSalary({
      ...salary,
      basic_salary: salary.basic_salary?.toString() || '',
      bonus: salary.bonus?.toString() || '',
      deductions: salary.deductions?.toString() || ''
    });
    setEditModalOpen(true);
  };

  // Handle edit modal close
  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setSelectedSalary(null);
  };

  // Handle edit modal submit (marks finalized salaries as needing re-finalization)
  const handleEditModalSubmit = async (formData) => {
    if (!canUpdate || !selectedSalary) return;
    
    try {
      const updateData = {
        basic_salary: parseFloat(formData.basic_salary) || 0,
        bonus: parseFloat(formData.bonus) || 0,
        deductions: parseFloat(formData.deductions) || 0,
        // If editing a finalized salary, mark it as pending (needs re-finalization)
        is_finalized: selectedSalary.is_finalized ? false : false
      };

      await put(`/api/employee-salaries/${selectedSalary.id}`, updateData);

      // Update local state
      setRowsState(prev => ({
        ...prev,
        rows: prev.rows.map(s => 
          s.id === selectedSalary.id 
            ? { 
                ...s, 
                ...updateData,
                net_salary: updateData.basic_salary + updateData.bonus - updateData.deductions,
                is_finalized: updateData.is_finalized
              }
            : s
        )
      }));

      const statusMessage = selectedSalary.is_finalized 
        ? 'Salary updated. Click "Re-Finalize" button to apply changes!' 
        : 'Salary updated successfully';
      
      toast.warning(statusMessage, {
        position: "top-right",
        autoClose: 3500,
      });

      handleEditModalClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update salary';
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Load available employees for adding to salary
  const loadAvailableEmployees = async () => {
    try {
      const response = await get('/api/employees');
      const allEmployees = Array.isArray(response) ? response : response.content || [];
      
      // Get current employee IDs in salary list
      const currentEmployeeIds = rowsState.rows.map(row => row.employee?.id).filter(Boolean);
      
      // Filter out employees who already have salaries for this month
      const available = allEmployees.filter(emp => 
        emp.status === 'active' && 
        !currentEmployeeIds.includes(emp.id) &&
        new Date(emp.joining_date) <= new Date(selectedYear, selectedMonth - 1, 1)
      );
      
      setAvailableEmployees(available);
    } catch (error) {
      console.error('Error loading available employees:', error);
      toast.error('Failed to load available employees', {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Handle add employee salary modal
  const handleAddEmployeeSalary = () => {
    loadAvailableEmployees();
    setAddEmployeeModalOpen(true);
  };

  // Handle add employee modal close
  const handleAddEmployeeModalClose = () => {
    setAddEmployeeModalOpen(false);
    setSelectedEmployee(null);
    setNewSalaryData({
      basic_salary: '',
      bonus: '',
      deductions: ''
    });
  };

  // Handle add employee salary submit
  const handleAddEmployeeSalarySubmit = async () => {
    if (!canCreate || !selectedEmployee) return;
    
    try {
      const salaryData = {
        employee_id: selectedEmployee.id,
        month: selectedMonth,
        year: selectedYear,
        basic_salary: parseFloat(newSalaryData.basic_salary) || 0,
        bonus: parseFloat(newSalaryData.bonus) || 0,
        deductions: parseFloat(newSalaryData.deductions) || 0
      };

      const response = await post('/api/employee-salaries', salaryData);

      // Add to local state
      setRowsState(prev => ({
        ...prev,
        rows: [...prev.rows, {
          ...response,
          employee: selectedEmployee,
          net_salary: salaryData.basic_salary + salaryData.bonus - salaryData.deductions
        }],
        rowCount: prev.rowCount + 1
      }));

      toast.success(`Added salary for ${selectedEmployee.name}`, {
        position: "top-right",
        autoClose: 3000,
      });

      handleAddEmployeeModalClose();
    } catch (error) {
      toast.error('Failed to add employee salary', {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Load expenses for selected month/year
  const loadExpenses = async () => {
    try {
      const response = await get(`/api/expenses?month=${selectedMonth}&year=${selectedYear}`);
      const expensesList = response.content || [];
      setExpenses(expensesList);
      
      // Calculate summary
      const totalAmount = expensesList.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
      setExpensesSummary({
        totalAmount,
        count: expensesList.length
      });
    } catch (error) {
      console.error('Error loading expenses:', error);
      // Don't show error toast for expenses loading, just set empty state
      setExpenses([]);
      setExpensesSummary({ totalAmount: 0, count: 0 });
    }
  };

  // Handle expenses modal
  const handleExpensesModal = () => {
    loadExpenses();
    setExpensesModalOpen(true);
  };

  // Handle expenses modal close
  const handleExpensesModalClose = () => {
    setExpensesModalOpen(false);
    setNewExpense({ description: '', amount: '' });
    setEditingExpense(null);
  };

  // Handle add expense
  const handleAddExpense = async () => {
    const amount = parseFloat(newExpense.amount) || 0;
    if (!newExpense.description.trim() || amount < 0) {
      toast.error('Please provide valid description and amount (>= 0)', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      const expenseData = {
        description: newExpense.description.trim(),
        amount: amount,
        month: selectedMonth,
        year: selectedYear
      };

      await post('/api/expenses', expenseData);

      toast.success('Expense added successfully', {
        position: "top-right",
        autoClose: 2000,
      });

      setNewExpense({ description: '', amount: '' });
      loadExpenses();
    } catch (error) {
      toast.error('Failed to add expense', {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Handle edit expense
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setNewExpense({
      description: expense.description,
      amount: expense.amount?.toString() || ''
    });
  };

  // Handle update expense
  const handleUpdateExpense = async () => {
    const amount = parseFloat(newExpense.amount) || 0;
    if (!editingExpense || !newExpense.description.trim() || amount < 0) {
      toast.error('Please provide valid description and amount (>= 0)', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      const updateData = {
        description: newExpense.description.trim(),
        amount: amount
      };

      await put(`/api/expenses/${editingExpense.id}`, updateData);

      toast.success('Expense updated successfully', {
        position: "top-right",
        autoClose: 2000,
      });

      setEditingExpense(null);
      setNewExpense({ description: '', amount: '' });
      loadExpenses();
    } catch (error) {
      toast.error('Failed to update expense', {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Handle delete expense
  const handleDeleteExpense = async (expenseId) => {
    try {
      await del(`/api/expenses/${expenseId}`);

      toast.success('Expense deleted successfully', {
        position: "top-right",
        autoClose: 2000,
      });

      loadExpenses();
    } catch (error) {
      toast.error('Failed to delete expense', {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  // Handle export salaries
  const handleExportSalaries = async () => {
    try {
      setIsLoading(true);
      
      // Get only finalized salaries
      const finalizedSalaries = rowsState.rows.filter(salary => salary.is_finalized);
      
      if (finalizedSalaries.length === 0) {
        toast.warning('No finalized salaries to export', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      // Create CSV content
      const headers = ['Employee Name', 'Designation', 'Basic Salary', 'Bonus', 'Deductions'];
      
      // Calculate totals
      const totalBasicSalary = finalizedSalaries.reduce((sum, salary) => sum + (parseFloat(salary.basic_salary) || 0), 0);
      const totalBonus = finalizedSalaries.reduce((sum, salary) => sum + (parseFloat(salary.bonus) || 0), 0);
      const totalDeductions = finalizedSalaries.reduce((sum, salary) => sum + (parseFloat(salary.deductions) || 0), 0);
      const totalNetSalary = totalBasicSalary + totalBonus - totalDeductions;
      
      const csvContent = [
        headers.join(','),
        ...finalizedSalaries.map(salary => [
          `"${salary.employee?.name || 'N/A'}"`,
          `"${salary.employee?.designation || 'N/A'}"`,
          salary.basic_salary || 0,
          salary.bonus || 0,
          salary.deductions || 0
        ].join(',')),
        `"Total","",${totalBasicSalary},${totalBonus},${totalDeductions}`
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Salaries_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${finalizedSalaries.length} finalized salaries`, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      toast.error('Failed to export salaries', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle export expenses
  const handleExportExpenses = async () => {
    try {
      setIsLoading(true);
      
      if (expenses.length === 0) {
        toast.warning('No expenses to export', {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      // Create CSV content
      const headers = ['Description', 'Amount'];
      const csvContent = [
        headers.join(','),
        ...expenses.map(expense => [
          `"${expense.description}"`,
          expense.amount || 0
        ].join(',')),
        `"Total Expenses",${expensesSummary.totalAmount}`
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Expenses_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${expenses.length} expenses`, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      toast.error('Failed to export expenses', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Search handlers
  const handleSearchChange = React.useCallback((event) => {
    const value = event.target.value;
    setSearchState(prev => ({ ...prev, search: value }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  const handleFinalizedChange = React.useCallback((event) => {
    const value = event.target.value;
    setSearchState(prev => ({ ...prev, is_finalized: value, isActive: true }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
    
    // Trigger search
    const searchParams = {
      search: searchState.search,
      is_finalized: value
    };
    performSearch(searchParams);
  }, [searchState.search]);

  // Perform search with multiple parameters
  const performSearch = React.useCallback(async (searchParams) => {
    if (!canRead) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      let apiUrl = `/api/employee-salaries?page=${page}&size=${pageSize}`;
      
      // Add search parameters
      const params = new URLSearchParams();
      
      params.append('month', selectedMonth);
      params.append('year', selectedYear);
      
      if (searchParams.search?.trim()) {
        params.append('search', searchParams.search.trim());
      }
      
      if (searchParams.is_finalized?.trim()) {
        params.append('is_finalized', searchParams.is_finalized.trim());
      }
      
      if (params.toString()) {
        apiUrl += `&${params.toString()}`;
      }
      
      const response = await get(apiUrl);
      
      if (response.content && Array.isArray(response.content)) {
        setRowsState({
          rows: response.content,
          rowCount: response.totalElements || response.content.length,
        });
      } else if (Array.isArray(response)) {
        setRowsState({
          rows: response,
          rowCount: response.length,
        });
      } else {
        setRowsState({
          rows: [],
          rowCount: 0,
        });
      }
      
    } catch (loadError) {
      console.error('Error searching salaries:', loadError);
      setError(loadError.message || 'Failed to search salaries');
      toast.error('Failed to search salaries', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead, selectedMonth, selectedYear]);

  // Key handlers for Enter key search
  const handleSearchKeyDown = React.useCallback((event) => {
    if (event.key === 'Enter') {
      setSearchState(prev => ({ ...prev, isActive: true }));
      const searchParams = {
        search: searchState.search,
        is_finalized: searchState.is_finalized
      };
      performSearch(searchParams);
    }
  }, [searchState.search, searchState.is_finalized, performSearch]);

  const handleClearAllSearch = React.useCallback(() => {
    setSearchState({
      search: '',
      is_finalized: '',
      isActive: false,
    });
    
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading && canRead) {
      if (searchState.isActive) {
        performSearch(searchState);
      } else {
        loadSalaries();
      }
    }
  }, [isLoading, canRead, searchState.isActive, searchState.search, searchState.is_finalized, performSearch, loadSalaries]);

  // Column definitions for salaries
  const columns = React.useMemo(
    () => [
      { 
        field: 'id', 
        headerName: 'ID',
        width: 70,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => (
          <Typography 
            variant="body2" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '100%',
              lineHeight: 1.5
            }}
          >
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'employee',
        headerName: 'Employee',
        width: 200,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => (
          <Typography 
            variant="body2"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '100%',
              lineHeight: 1.5
            }}
          >
            {params.value?.name || 'N/A'}
          </Typography>
        ),
      },
      {
        field: 'basic_salary',
        headerName: 'Basic Salary',
        width: 180,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => (
          <Typography 
            variant="body2" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '100%',
              lineHeight: 1.5
            }}
          >
            PKR {params.value ? parseFloat(params.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </Typography>
        ),
      },
      {
        field: 'bonus',
        headerName: 'Bonus',
        width: 170,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => (
          <Typography 
            variant="body2" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '100%',
              lineHeight: 1.5
            }}
          >
            PKR {params.value ? parseFloat(params.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </Typography>
        ),
      },
      {
        field: 'deductions',
        headerName: 'Deductions',
        width: 180,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => (
          <Typography 
            variant="body2" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '100%',
              lineHeight: 1.5
            }}
          >
            PKR {params.value ? parseFloat(params.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </Typography>
        ),
      },
      {
        field: 'net_salary',
        headerName: 'Net Salary',
        width: 180,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => (
          <Typography 
            variant="body2" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '100%',
              lineHeight: 1.5,
              fontWeight: 'bold' 
            }}
          >
            PKR {params.value ? parseFloat(params.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </Typography>
        ),
      },
      {
        field: 'is_finalized',
        headerName: 'Status',
        width: 180,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => {
          // Check if any salary in this month is finalized
          const hasAnyFinalized = rowsState.rows.some(s => s.is_finalized);
          // If month has finalized salaries and this one is not finalized, it needs re-finalization
          const needsRefinalize = hasAnyFinalized && !params.value;
          
          return (
            <Box
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: '100%',
                lineHeight: 1.5
              }}
            >
              <Chip 
                label={needsRefinalize ? 'Modified - Needs Re-Finalize' : params.value ? 'Finalized' : 'Pending'} 
                variant="outlined" 
                size="small"
                color={needsRefinalize ? 'error' : params.value ? 'success' : 'warning'}
              />
            </Box>
          );
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 100,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const hasAnyFinalized = rowsState.rows.some(s => s.is_finalized);
          const needsRefinalize = hasAnyFinalized && !params.row.is_finalized;
          const tooltipText = needsRefinalize 
            ? "Edit Modified Salary (Needs Re-Finalize)" 
            : params.row.is_finalized 
              ? "Edit Finalized Salary" 
              : "Edit Salary";
          
          return (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                gap: 1 
              }}
            >
              <Tooltip title={tooltipText}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleEditSalary(params.row)}
                  sx={{
                    bgcolor: needsRefinalize 
                      ? 'error.light' 
                      : params.row.is_finalized 
                        ? 'success.light' 
                        : 'transparent',
                    '&:hover': {
                      bgcolor: needsRefinalize 
                        ? 'error.main' 
                        : params.row.is_finalized 
                          ? 'success.main' 
                          : 'action.hover'
                    }
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [rowsState.rows],
  );

  const pageTitle = 'Salary Management';

  // If user doesn't have read permission, show error message
  if (!canRead) {
    return (
      <PageContainer title={pageTitle} breadcrumbs={[{ title: pageTitle }]}>
        <Alert severity="error" sx={{ mb: 2 }}>
          You do not have permission to view this page
        </Alert>
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          toastStyle={{
            backgroundColor: '#ffffff',
            color: '#333333',
          }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={pageTitle}
      breadcrumbs={[{ title: pageTitle }]}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Month/Year Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Select Month & Year
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Month</InputLabel>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  label="Month"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label="Year"
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    return (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                onClick={handleGenerateSalaries}
                disabled={isLoading || !canCreate}
                startIcon={isLoading ? <CircularProgress size={20} /> : <Add />}
                fullWidth
              >
                {isLoading ? 'Generating...' : 'Generate / Fetch Salaries'}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleAddEmployeeSalary}
                disabled={!canCreate || !salariesGenerated}
                startIcon={<Add />}
                fullWidth
                sx={{ minWidth: 150 }}
              >
                Add Employee
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleExpensesModal}
                disabled={!salariesGenerated}
                startIcon={<Add />}
                fullWidth
                sx={{ minWidth: 150 }}
              >
                {expensesSummary.count > 0 ? 'Edit Expenses' : 'Add Expenses'}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={2}>
              {(() => {
                const hasAnyFinalized = rowsState.rows.some(s => s.is_finalized);
                const needsRefinalization = hasAnyFinalized && rowsState.rows.some(s => !s.is_finalized);
                
                return (
                  <Button
                    variant="outlined"
                    color={needsRefinalization ? "error" : "success"}
                    onClick={handleFinalizeSalaries}
                    disabled={isLoading || !canUpdate || !salariesGenerated}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <CheckCircle />}
                    fullWidth
                    sx={{ 
                      fontWeight: needsRefinalization || isFinalized ? 'bold' : 'normal',
                      borderWidth: needsRefinalization || isFinalized ? 2 : 1,
                      animation: needsRefinalization ? 'pulse 2s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': {
                          boxShadow: '0 0 0 0 rgba(255, 0, 0, 0.7)'
                        },
                        '70%': {
                          boxShadow: '0 0 0 10px rgba(255, 0, 0, 0)'
                        },
                        '100%': {
                          boxShadow: '0 0 0 0 rgba(255, 0, 0, 0)'
                        }
                      }
                    }}
                  >
                    {isLoading ? 'Finalizing...' : needsRefinalization ? '⚠️ Re-Finalize Now!' : isFinalized ? 'Re-Finalize' : 'Finalize Salaries'}
                  </Button>
                );
              })()}
            </Grid>
            
            {/* Export Buttons */}
            {salariesGenerated && rowsState.rows.length > 0 && (
              <Grid item xs={12} sm={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleExportSalaries}
                  disabled={isLoading}
                  startIcon={<Save />}
                  fullWidth
                >
                  Export Salaries
                </Button>
              </Grid>
            )}
            
            {expensesSummary.count > 0 && (
              <Grid item xs={12} sm={2}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleExportExpenses}
                  disabled={isLoading}
                  startIcon={<Save />}
                  fullWidth
                >
                  Export Expenses
                </Button>
              </Grid>
            )}
          </Grid>
          
          {/* Salary Summary */}
          {salariesGenerated && rowsState.rows.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Card sx={{ minWidth: 200, bgcolor: 'primary.light', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Total Employees
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {rowsState.rows.length}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ minWidth: 200, bgcolor: 'success.light', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Total Net Salary
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    PKR {rowsState.rows.reduce((sum, salary) => sum + (parseFloat(salary.net_salary) || 0), 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ minWidth: 200, bgcolor: 'warning.light', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Total Basic Salary
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    PKR {rowsState.rows.reduce((sum, salary) => sum + (parseFloat(salary.basic_salary) || 0), 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ minWidth: 200, bgcolor: 'info.light', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Total Bonus
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    PKR {rowsState.rows.reduce((sum, salary) => sum + (parseFloat(salary.bonus) || 0), 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ minWidth: 200, bgcolor: 'error.light', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Total Deductions
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    PKR {rowsState.rows.reduce((sum, salary) => sum + (parseFloat(salary.deductions) || 0), 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ minWidth: 200, bgcolor: isFinalized ? 'success.main' : 'warning.main', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Status
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {isFinalized ? 'Finalized' : 'Pending'}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ minWidth: 200, bgcolor: 'secondary.light', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Total Expenses
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    PKR {expensesSummary.totalAmount.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ minWidth: 200, bgcolor: 'info.main', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Expenses Count
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {expensesSummary.count}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}

          {isFinalized && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Salaries for {selectedMonth}/{selectedYear} have been finalized. You can still edit individual salary entries if needed.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Alert for salaries needing re-finalization */}
      {(() => {
        const hasAnyFinalized = salariesGenerated && rowsState.rows.some(s => s.is_finalized);
        const needsRefinalization = hasAnyFinalized && rowsState.rows.some(s => !s.is_finalized);
        const modifiedCount = hasAnyFinalized ? rowsState.rows.filter(s => !s.is_finalized).length : 0;
        
        return needsRefinalization && (
          <Alert severity="error" sx={{ mb: 3, fontWeight: 'bold' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              ⚠️ Action Required: Modified Salaries Detected
            </Typography>
            <Typography variant="body2">
              You have {modifiedCount} salary(ies) that were modified. 
              These changes are saved but <strong>NOT yet effective</strong>. 
              Please click the <strong>"Re-Finalize"</strong> button above to apply all changes!
            </Typography>
          </Alert>
        );
      })()}

      {/* Search Components */}
      {canRead && salariesGenerated && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Search & Filter
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {/* Search Field */}
            <TextField
              label="Search Employees"
              placeholder="Search by employee name..."
              value={searchState.search}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Finalized Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={searchState.is_finalized}
                onChange={handleFinalizedChange}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="false">Pending</MenuItem>
                <MenuItem value="true">Finalized</MenuItem>
              </Select>
            </FormControl>

            {/* Clear All Button */}
            <Button
              variant="outlined"
              onClick={handleClearAllSearch}
              startIcon={<Clear />}
              size="small"
            >
              Clear All
            </Button>
          </Box>

          {/* Active Search Indicator */}
          {searchState.isActive && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`Active Search: ${[
                  searchState.search && `Search: ${searchState.search}`,
                  searchState.is_finalized && `Status: ${searchState.is_finalized === 'true' ? 'Finalized' : 'Pending'}`
                ].filter(Boolean).join(', ')}`}
                onDelete={handleClearAllSearch}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
          )}
        </Box>
      )}

      {salariesGenerated ? (
        <ReusableDataTable
          data={rowsState.rows}
          columns={columns}
          loading={isLoading}
          error={error}
          
          // Pagination
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          rowCount={rowsState.rowCount}
          paginationMode="server"
          
          // Sorting
          sortModel={sortModel}
          onSortModelChange={handleSortModelChange}
          sortingMode="server"
          
          // Filtering
          filterModel={filterModel}
          onFilterModelChange={handleFilterModelChange}
          filterMode="client"
          
          // Actions
          onRefresh={canRead ? handleRefresh : null}
          
          // Configuration
          pageSizeOptions={[5, 10, 25, 50]}
          showToolbar={true}
        />
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No salaries generated yet
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Select a month and year, then click "Generate / Fetch Salaries" to get started.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Edit Salary Modal */}
      <Dialog 
        open={editModalOpen} 
        onClose={handleEditModalClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Edit Salary - {selectedSalary?.employee?.name || 'N/A'}</span>
            {selectedSalary?.is_finalized && (
              <Chip 
                label="Finalized" 
                color="success" 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {(() => {
              const hasAnyFinalized = rowsState.rows.some(s => s.is_finalized);
              const isCurrentlyFinalized = selectedSalary?.is_finalized;
              const needsRefinalize = hasAnyFinalized && !isCurrentlyFinalized;
              
              return (
                <>
                  {isCurrentlyFinalized && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <strong>Warning:</strong> This salary is finalized. After saving changes, you <strong>MUST click the "Re-Finalize" button</strong> to make your changes effective!
                    </Alert>
                  )}
                  {needsRefinalize && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <strong>This salary was modified!</strong> Click the "Re-Finalize" button to apply changes.
                    </Alert>
                  )}
                </>
              );
            })()}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Basic Salary"
                  type="text"
                  fullWidth
                  value={selectedSalary?.basic_salary || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string, numbers, and decimal point
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setSelectedSalary(prev => ({
                        ...prev,
                        basic_salary: value
                      }));
                    }
                  }}
                  onBlur={(e) => {
                    // Convert to number on blur, default to 0 if empty
                    const numValue = parseFloat(e.target.value) || 0;
                    setSelectedSalary(prev => ({
                      ...prev,
                      basic_salary: numValue.toString()
                    }));
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">PKR</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Bonus"
                  type="text"
                  fullWidth
                  value={selectedSalary?.bonus || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string, numbers, and decimal point
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setSelectedSalary(prev => ({
                        ...prev,
                        bonus: value
                      }));
                    }
                  }}
                  onBlur={(e) => {
                    // Convert to number on blur, default to 0 if empty
                    const numValue = parseFloat(e.target.value) || 0;
                    setSelectedSalary(prev => ({
                      ...prev,
                      bonus: numValue.toString()
                    }));
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">PKR</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Deductions"
                  type="text"
                  fullWidth
                  value={selectedSalary?.deductions || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string, numbers, and decimal point
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setSelectedSalary(prev => ({
                        ...prev,
                        deductions: value
                      }));
                    }
                  }}
                  onBlur={(e) => {
                    // Convert to number on blur, default to 0 if empty
                    const numValue = parseFloat(e.target.value) || 0;
                    setSelectedSalary(prev => ({
                      ...prev,
                      deductions: numValue.toString()
                    }));
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">PKR</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  Net Salary: PKR {selectedSalary ? 
                    (() => {
                      const basic = parseFloat(selectedSalary.basic_salary) || 0;
                      const bonus = parseFloat(selectedSalary.bonus) || 0;
                      const deductions = parseFloat(selectedSalary.deductions) || 0;
                      return (basic + bonus - deductions).toFixed(2);
                    })()
                    : '0.00'
                  }
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditModalClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleEditModalSubmit(selectedSalary)}
            variant="contained"
            disabled={!selectedSalary}
            color={(() => {
              const hasAnyFinalized = rowsState.rows.some(s => s.is_finalized);
              const needsRefinalize = hasAnyFinalized || selectedSalary?.is_finalized;
              return needsRefinalize ? 'warning' : 'primary';
            })()}
          >
            {(() => {
              const hasAnyFinalized = rowsState.rows.some(s => s.is_finalized);
              const needsRefinalize = hasAnyFinalized || selectedSalary?.is_finalized;
              return needsRefinalize ? 'Save Changes (Requires Re-Finalize)' : 'Save Changes';
            })()}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Employee Salary Modal */}
      <Dialog 
        open={addEmployeeModalOpen} 
        onClose={handleAddEmployeeModalClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Add Employee Salary - {selectedMonth}/{selectedYear}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Employee</InputLabel>
                  <Select
                    value={selectedEmployee?.id || ''}
                    onChange={(e) => {
                      const employee = availableEmployees.find(emp => emp.id === e.target.value);
                      setSelectedEmployee(employee);
                      if (employee) {
                        setNewSalaryData(prev => ({
                          ...prev,
                          basic_salary: employee.basic_salary?.toString() || ''
                        }));
                      }
                    }}
                    label="Select Employee"
                    sx={{ 
                      minWidth: 400,
                      '& .MuiSelect-select': {
                        padding: '12px 14px'
                      }
                    }}
                  >
                    {availableEmployees.map((employee) => (
                      <MenuItem key={employee.id} value={employee.id} sx={{ minWidth: 400 }}>
                        {employee.name} - {employee.designation} (PKR {employee.basic_salary || 0})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {selectedEmployee && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      label="Basic Salary"
                      type="text"
                      fullWidth
                      value={newSalaryData.basic_salary}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string, numbers, and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setNewSalaryData(prev => ({
                            ...prev,
                            basic_salary: value
                          }));
                        }
                      }}
                      onBlur={(e) => {
                        // Convert to number on blur, default to 0 if empty
                        const numValue = parseFloat(e.target.value) || 0;
                        setNewSalaryData(prev => ({
                          ...prev,
                          basic_salary: numValue.toString()
                        }));
                      }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">PKR</InputAdornment>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Bonus"
                      type="text"
                      fullWidth
                      value={newSalaryData.bonus}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string, numbers, and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setNewSalaryData(prev => ({
                            ...prev,
                            bonus: value
                          }));
                        }
                      }}
                      onBlur={(e) => {
                        // Convert to number on blur, default to 0 if empty
                        const numValue = parseFloat(e.target.value) || 0;
                        setNewSalaryData(prev => ({
                          ...prev,
                          bonus: numValue.toString()
                        }));
                      }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">PKR</InputAdornment>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Deductions"
                      type="text"
                      fullWidth
                      value={newSalaryData.deductions}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string, numbers, and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setNewSalaryData(prev => ({
                            ...prev,
                            deductions: value
                          }));
                        }
                      }}
                      onBlur={(e) => {
                        // Convert to number on blur, default to 0 if empty
                        const numValue = parseFloat(e.target.value) || 0;
                        setNewSalaryData(prev => ({
                          ...prev,
                          deductions: numValue.toString()
                        }));
                      }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">PKR</InputAdornment>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      Net Salary: PKR {(() => {
                        const basic = parseFloat(newSalaryData.basic_salary) || 0;
                        const bonus = parseFloat(newSalaryData.bonus) || 0;
                        const deductions = parseFloat(newSalaryData.deductions) || 0;
                        return (basic + bonus - deductions).toFixed(2);
                      })()}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddEmployeeModalClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddEmployeeSalarySubmit}
            variant="contained"
            disabled={!selectedEmployee}
          >
            Add Salary
          </Button>
        </DialogActions>
      </Dialog>

      {/* Expenses Modal */}
      <Dialog 
        open={expensesModalOpen} 
        onClose={handleExpensesModalClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingExpense ? 'Edit Expense' : 'Add Expense'} - {selectedMonth}/{selectedYear}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Add/Edit Expense Form */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Description"
                  fullWidth
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Enter expense description..."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Amount"
                  type="text"
                  fullWidth
                  value={newExpense.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string, numbers, and decimal point
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setNewExpense(prev => ({
                        ...prev,
                        amount: value
                      }));
                    }
                  }}
                  onBlur={(e) => {
                    // Convert to number on blur, default to 0 if empty
                    const numValue = parseFloat(e.target.value) || 0;
                    setNewExpense(prev => ({
                      ...prev,
                      amount: numValue.toString()
                    }));
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">PKR</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  onClick={editingExpense ? handleUpdateExpense : handleAddExpense}
                  fullWidth
                  disabled={!newExpense.description.trim() || (parseFloat(newExpense.amount) || 0) < 0}
                >
                  {editingExpense ? 'Update' : 'Add'}
                </Button>
              </Grid>
            </Grid>

            {/* Expenses List */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Expenses List ({expenses.length} items)
            </Typography>
            
            {expenses.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            PKR {parseFloat(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditExpense(expense)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteExpense(expense.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="textSecondary">
                  No expenses added yet for {selectedMonth}/{selectedYear}
                </Typography>
              </Box>
            )}

            {/* Total Summary */}
            {expenses.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Total Expenses: PKR {expensesSummary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExpensesModalClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* React Toastify Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{
          backgroundColor: '#ffffff',
          color: '#333333',
        }}
      />
    </PageContainer>
  );
}
