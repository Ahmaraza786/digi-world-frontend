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
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../auth/AuthContext';
import ReusableDataTable from '../components/ReusableData';
import PageContainer from '../components/PageContainer';
import DynamicModal from '../components/DynamicModel';
import { useApi } from '../hooks/useApi';
import { Search, Clear } from '@mui/icons-material';

const INITIAL_PAGE_SIZE = 10;

export default function EmployeeManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user } = useAuth();
  
  // Check user permissions
  const canRead = user?.permissions?.employee?.includes('read') || false;
  const canCreate = user?.permissions?.employee?.includes('create') || false;
  const canUpdate = user?.permissions?.employee?.includes('update') || false;
  const canDelete = user?.permissions?.employee?.includes('delete') || false;

  const { get, post, put, del } = useApi();

  const [rowsState, setRowsState] = React.useState({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState('view');
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [employeeToDelete, setEmployeeToDelete] = React.useState(null);


  // Search state
  const [searchState, setSearchState] = React.useState({
    search: '',
    status: '',
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

  // Validation functions
  const validateName = (name) => {
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters';
    return '';
  };

  const validateDesignation = (designation) => {
    if (designation && designation.length < 2) return 'Designation must be at least 2 characters';
    return '';
  };

  const validateBasicSalary = (salary) => {
    if (!salary) return 'Basic salary is required';
    if (salary <= 0) return 'Basic salary must be greater than 0';
    return '';
  };

  const validateStatus = (status) => {
    if (!status) return 'Status is required';
    if (!['active', 'inactive'].includes(status)) return 'Invalid status';
    return '';
  };


  // Define employee form fields
  const getEmployeeFields = (isViewMode = false) => [
    {
      name: 'name',
      label: 'Employee Name',
      type: 'text',
      required: true,
      validate: validateName,
      tooltip: 'Full name of the employee'
    },
    {
      name: 'designation',
      label: 'Designation',
      type: 'text',
      required: false,
      validate: validateDesignation,
      tooltip: 'Job title or position'
    },
    {
      name: 'joining_date',
      label: 'Joining Date',
      type: 'custom',
      required: false,
      tooltip: 'Date when employee joined',
      render: (value, onChange, isViewMode, formData) => (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            key={value || 'empty'}
            label="Joining Date"
            value={value ? new Date(value) : null}
            onChange={(newValue) => {
              if (newValue) {
                // Ensure we get the correct date by handling timezone issues
                const year = newValue.getFullYear();
                const month = String(newValue.getMonth() + 1).padStart(2, '0');
                const day = String(newValue.getDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;
                onChange(formattedDate);
              } else {
                onChange('');
              }
            }}
            disabled={isViewMode}
            closeOnSelect={true}
            slotProps={{
              textField: {
                fullWidth: true,
                margin: 'normal',
                size: 'small',
                variant: isViewMode ? 'filled' : 'outlined',
                InputProps: {
                  readOnly: isViewMode,
                },
              },
            }}
            sx={{ mt: 2 }}
            format="dd/MM/yyyy"
            views={['year', 'month', 'day']}
          />
        </LocalizationProvider>
      )
    },
    {
      name: 'basic_salary',
      label: 'Basic Salary',
      type: 'number',
      required: true,
      validate: validateBasicSalary,
      tooltip: 'Monthly basic salary',
      InputProps: {
        startAdornment: <InputAdornment position="start">PKR</InputAdornment>
      }
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      validate: validateStatus,
      tooltip: 'Employee status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

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

  // API call to fetch employees with pagination
  const loadEmployees = React.useCallback(async () => {
    if (!canRead) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      
      let apiUrl = `/api/employees?page=${page}&size=${pageSize}`;
      
      // Add search parameters
      const params = new URLSearchParams();
      
      if (searchState.search?.trim()) {
        params.append('search', searchState.search.trim());
      }
      
      if (searchState.status?.trim()) {
        params.append('status', searchState.status.trim());
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
      console.error('Error loading employees:', loadError);
      setError(loadError.message || 'Failed to load employees');
      toast.error('Failed to load employees', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead, searchState.search, searchState.status]);

  // Load data effect
  React.useEffect(() => {
    const hasSearchCriteria = searchState.search || searchState.status;
    
    if (!hasSearchCriteria) {
      setSearchState(prev => ({ ...prev, isActive: false }));
      loadEmployees();
    }
  }, [paginationModel, loadEmployees]);

  // Action handlers
  const handleView = React.useCallback((employeeData) => {
    if (!canRead) return;
    setSelectedEmployee(employeeData);
    setModalMode('view');
    setModalOpen(true);
  }, [canRead]);

  const handleEdit = React.useCallback((employeeData) => {
    if (!canUpdate) return;
    setSelectedEmployee(employeeData);
    setModalMode('edit');
    setModalOpen(true);
  }, [canUpdate]);

  const handleDelete = React.useCallback((employeeData) => {
    if (!canDelete) return;
    setEmployeeToDelete(employeeData);
    setDeleteDialogOpen(true);
  }, [canDelete]);

  // Confirm delete function
  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    
    setIsLoading(true);
    setDeleteDialogOpen(false);
    
    try {
      await del(`/api/employees/${employeeToDelete.id}`);

      toast.success(`Employee ${employeeToDelete.name} deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      loadEmployees();
    } catch (deleteError) {
      toast.error(`Failed to delete employee: ${deleteError.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
      setEmployeeToDelete(null);
    }
  };

  // Cancel delete function
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

  const handleCreate = React.useCallback(() => {
    if (!canCreate) return;
    setSelectedEmployee({ 
      name: '',
      designation: '',
      joining_date: '',
      basic_salary: '',
      status: 'active'
    });
    setModalMode('create');
    setModalOpen(true);
  }, [canCreate]);

  // Search handlers
  const handleSearchChange = React.useCallback((event) => {
    const value = event.target.value;
    setSearchState(prev => ({ ...prev, search: value }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  const handleStatusChange = React.useCallback((event) => {
    const value = event.target.value;
    setSearchState(prev => ({ ...prev, status: value, isActive: true }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
    
    // Status change triggers immediate search
    const searchParams = {
      search: searchState.search,
      status: value
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
      let apiUrl = `/api/employees?page=${page}&size=${pageSize}`;
      
      // Add search parameters
      const params = new URLSearchParams();
      
      if (searchParams.search?.trim()) {
        params.append('search', searchParams.search.trim());
      }
      
      if (searchParams.status?.trim()) {
        params.append('status', searchParams.status.trim());
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
      console.error('Error searching employees:', loadError);
      setError(loadError.message || 'Failed to search employees');
      toast.error('Failed to search employees', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead]);

  // Key handlers for Enter key search
  const handleSearchKeyDown = React.useCallback((event) => {
    if (event.key === 'Enter') {
      setSearchState(prev => ({ ...prev, isActive: true }));
      const searchParams = {
        search: searchState.search,
        status: searchState.status
      };
      performSearch(searchParams);
    }
  }, [searchState.search, searchState.status, performSearch]);

  const handleClearAllSearch = React.useCallback(() => {
    setSearchState({
      search: '',
      status: '',
      isActive: false,
    });
    
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading && canRead) {
      if (searchState.isActive) {
        performSearch(searchState);
      } else {
        loadEmployees();
      }
    }
  }, [isLoading, canRead, searchState.isActive, searchState.search, searchState.status, performSearch, loadEmployees]);

  const handleRowClick = React.useCallback(
    ({ row }) => {
      handleView(row);
    },
    [handleView],
  );

  // Handle modal submit
  const handleModalSubmit = async (formData) => {
    if (modalMode === 'view') {
      setModalOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        name: formData.name,
        designation: formData.designation || null,
        joining_date: formData.joining_date || null,
        basic_salary: parseFloat(formData.basic_salary),
        status: formData.status
      };

      let response;
      
      if (modalMode === 'create') {
        response = await post('/api/employees', submitData);
      } else {
        response = await put(`/api/employees/${selectedEmployee.id}`, submitData);
      }

      const successMessage = modalMode === 'create' 
        ? 'Employee created successfully!' 
        : 'Employee updated successfully!';
      
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setModalOpen(false);
      loadEmployees();
    } catch (submitError) {
      let errorMessage = `Failed to ${modalMode} employee`;
      
      if (submitError.response && submitError.response.data) {
        const serverError = submitError.response.data;
        
        if (serverError.message) {
          errorMessage = serverError.message;
        } else if (typeof serverError === 'string') {
          errorMessage = serverError;
        } else if (serverError.error) {
          errorMessage = serverError.error;
        }
      } else if (submitError.message) {
        errorMessage = submitError.message;
      }
      
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
   
    } finally {
      setIsLoading(false);
    }
  };

  // Column definitions for employees
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
        field: 'name',
        headerName: 'Employee Name',
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
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'designation',
        headerName: 'Designation',
        width: 150,
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
            {params.value || 'N/A'}
          </Typography>
        ),
      },
      {
        field: 'basic_salary',
        headerName: 'Basic Salary',
        width: 130,
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
        field: 'status',
        headerName: 'Status',
        width: 120,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => {
          const getStatusColor = (status) => {
            switch (status) {
              case 'active': return 'success';
              case 'inactive': return 'error';
              default: return 'default';
            }
          };
          
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
                label={params.value} 
                variant="outlined" 
                size="small"
                color={getStatusColor(params.value)}
              />
            </Box>
          );
        },
      },
      {
        field: 'joining_date',
        headerName: 'Joining Date',
        width: 130,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => {
          if (!params.value) {
            return (
              <Typography 
                variant="body2" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  height: '100%',
                  lineHeight: 1.5
                }}
              >
                N/A
              </Typography>
            );
          }
          try {
            const date = new Date(params.value);
            return (
              <Typography 
                variant="body2" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  height: '100%',
                  lineHeight: 1.5
                }}
              >
                {date.toLocaleDateString()}
              </Typography>
            );
          } catch (error) {
            return (
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
            );
          }
        },
      },
      {
        field: 'created_at',
        headerName: 'Created At',
        width: 180,
        align: 'left',
        headerAlign: 'left',
        valueFormatter: (params) => {
          if (!params.value) return '';
          try {
            const date = new Date(params.value);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
          } catch (error) {
            return params.value;
          }
        },
        renderCell: (params) => {
          if (!params.value) return '';
          try {
            const date = new Date(params.value);
            return (
              <Typography 
                variant="body2" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  height: '100%',
                  lineHeight: 1.5
                }}
              >
                {date.toLocaleDateString()} 
                <br />
                {date.toLocaleTimeString()}
              </Typography>
            );
          } catch (error) {
            return params.value;
          }
        },
      },
    ],
    [],
  );

  const pageTitle = 'Employee Management';

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

      {/* Search Components */}
      {canRead && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Search & Filter
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {/* Search Field */}
            <TextField
              label="Search Employees"
              placeholder="Search by name or designation..."
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

            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={searchState.status}
                onChange={handleStatusChange}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
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
                  searchState.status && `Status: ${searchState.status}`
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
        
        // Actions - conditionally show based on permissions
        onView={canRead ? handleView : null}
        onEdit={canUpdate ? handleEdit : null}
        onDelete={canDelete ? handleDelete : null}
        onCreate={canCreate ? handleCreate : null}
        onRefresh={canRead ? handleRefresh : null}
        
        // Row interaction
        onRowClick={canRead ? handleRowClick : null}
        
        // Configuration
        pageSizeOptions={[5, 10, 25, 50]}
        showToolbar={true}
      />

      {/* Dynamic Modal for Employee CRUD */}
      <DynamicModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        title={`${modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Edit' : 'View'} Employee`}
        initialData={selectedEmployee || {}}
        fields={getEmployeeFields(modalMode === 'view')}
        onSubmit={handleModalSubmit}
        loading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            minWidth: '400px',
          }
        }}
      >
        <DialogTitle 
          id="delete-dialog-title"
          sx={{ 
            color: '#d32f2f',
            fontWeight: 'bold',
          }}
        >
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#333', mb: 2 }}>
            Are you sure you want to delete employee <strong>"{employeeToDelete?.name}"</strong>?
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={cancelDelete}
            variant="outlined"
            sx={{ 
              color: '#666',
              borderColor: '#ddd',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: '#f5f5f5',
              }
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete}
            variant="contained"
            sx={{
              backgroundColor: '#d32f2f',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#c62828',
              },
              '&:disabled': {
                backgroundColor: '#ffcdd2',
                color: '#ffffff',
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
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
