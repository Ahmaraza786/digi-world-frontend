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
  Autocomplete,
  TextField,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../auth/AuthContext';
import ReusableDataTable from '../components/ReusableData';
import PageContainer from '../components/PageContainer';
import DynamicModal from '../components/DynamicModel';
import { BASE_URL } from "../constants/Constants";
import { useApi } from '../hooks/useApi';
import { Search, Clear } from '@mui/icons-material';

const INITIAL_PAGE_SIZE = 10;

export default function CustomerManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, hasPermission, token } = useAuth();
  
  // Check user permissions
  const canRead = user?.permissions?.customer?.includes('read') || false;
  const canCreate = user?.permissions?.customer?.includes('create') || false;
  const canUpdate = user?.permissions?.customer?.includes('update') || false;
  const canDelete = user?.permissions?.customer?.includes('delete') || false;

  const { get, post, put, del } = useApi();

  // Core table state
  const [rowsState, setRowsState] = React.useState({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState('view');
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [customerToDelete, setCustomerToDelete] = React.useState(null);

  // Search state - simplified and consolidated
  const [searchState, setSearchState] = React.useState({
    query: '',
    isActive: false,
    dropdownOptions: [],
    isLoadingDropdown: false,
  });

  // Search optimization
  const [searchCache] = React.useState(new Map());
  const abortControllerRef = React.useRef(null);
  const debounceTimeoutRef = React.useRef(null);

  // Table pagination state
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

  // Check permissions on mount
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
  }, [canRead]);

  // Cleanup function for search
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Search dropdown function - only for autocomplete suggestions
  const searchDropdownOptions = React.useCallback(async (query) => {
    const trimmedQuery = query?.trim();
    
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSearchState(prev => ({ ...prev, dropdownOptions: [], isLoadingDropdown: false }));
      return;
    }

    // Check cache first
    const cacheKey = `dropdown-${trimmedQuery}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      setSearchState(prev => ({ ...prev, dropdownOptions: cached.options, isLoadingDropdown: false }));
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const newAbortController = new AbortController();
    abortControllerRef.current = newAbortController;

    setSearchState(prev => ({ ...prev, isLoadingDropdown: true }));
    
    try {
      const response = await get(`/api/customers/search?search=${encodeURIComponent(trimmedQuery)}&page=0&size=10`, {
        signal: newAbortController.signal
      });
      
      if (response.success && response.customers) {
        // Cache the results
        searchCache.set(cacheKey, {
          options: response.customers,
          timestamp: Date.now()
        });
        
        // Limit cache size
        if (searchCache.size > 50) {
          const firstKey = searchCache.keys().next().value;
          searchCache.delete(firstKey);
        }
        
        setSearchState(prev => ({ ...prev, dropdownOptions: response.customers }));
      } else {
        setSearchState(prev => ({ ...prev, dropdownOptions: [] }));
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error searching customers:', error);
        setSearchState(prev => ({ ...prev, dropdownOptions: [] }));
      }
    } finally {
      setSearchState(prev => ({ ...prev, isLoadingDropdown: false }));
      abortControllerRef.current = null;
    }
  }, [get, searchCache]);

  // Debounced dropdown search
  const debouncedDropdownSearch = React.useCallback((query) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      searchDropdownOptions(query);
    }, 300);
  }, [searchDropdownOptions]);

  // Load all customers
  const loadCustomers = React.useCallback(async () => {
    if (!canRead) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      const apiUrl = `/api/customers?page=${page}&size=${pageSize}`;
      const customerData = await get(apiUrl);
      
      if (customerData.customers && Array.isArray(customerData.customers)) {
        setRowsState({
          rows: customerData.customers,
          rowCount: customerData.totalCount || customerData.customers.length,
        });
      } else if (Array.isArray(customerData)) {
        setRowsState({
          rows: customerData,
          rowCount: customerData.length,
        });
      } else {
        setRowsState({
          rows: [],
          rowCount: 0,
        });
      }
      
    } catch (loadError) {
      setError(loadError.message || 'Failed to load customers');
      toast.error('Failed to load customers', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.error('Error loading customers:', loadError);
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead]);

  // Search customers for table results
  const searchCustomers = React.useCallback(async (searchTerm) => {
    if (!canRead || !searchTerm?.trim()) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      const apiUrl = `/api/customers?page=${page}&size=${pageSize}&search=${encodeURIComponent(searchTerm.trim())}`;
      
      console.log('🔍 Searching customers with URL:', apiUrl);
      const response = await get(apiUrl);
      console.log('✅ Search API response:', response);
      
      if (response.success && Array.isArray(response.customers)) {
        setRowsState({
          rows: response.customers,
          rowCount: response.totalCount || response.customers.length,
        });
        console.log('📊 Table updated with search results');
      } else {
        setRowsState({
          rows: [],
          rowCount: 0,
        });
      }
      
    } catch (loadError) {
      console.error('💥 Error searching customers:', loadError);
      setError(loadError.message || 'Failed to search customers');
      toast.error('Failed to search customers', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead]);

  // Load data effect - fixed dependencies
  React.useEffect(() => {
    if (searchState.isActive && searchState.query) {
      searchCustomers(searchState.query);
    } else if (!searchState.isActive) {
      loadCustomers();
    }
  }, [paginationModel, searchState.isActive, searchState.query]); // Fixed dependencies

  // Validation functions
  const validateCustomerName = (name) => {
    if (!name) return 'Customer name is required';
    if (name.length < 2) return 'Customer name must be at least 2 characters';
    return '';
  };

  const validatePhoneNumber = (phone) => {
    if (phone && phone.length > 50) return 'Phone number must be less than 50 characters';
    return '';
  };

  const validateFax = (fax) => {
    if (fax && fax.length > 50) return 'Fax number must be less than 50 characters';
    return '';
  };

  const validateNtn = (ntn) => {
    if (ntn && ntn.length > 50) return 'NTN must be less than 50 characters';
    return '';
  };

  const validateEmail = (email) => {
    if (!email) return ''; // Email is optional
    if (email.length > 255) return 'Email must be less than 255 characters';
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Invalid email format';
    return '';
  };

  const validateCompanyName = (name) => {
    if (name && name.length > 255) return 'Company name must be less than 255 characters';
    return '';
  };

  // Define customer form fields
  const getCustomerFields = (isViewMode = false) => [
    {
      name: 'customerName',
      label: 'Purchaser',
      type: 'text',
      required: true,
      readOnly: isViewMode,
      validate: validateCustomerName,
      tooltip: 'Must be at least 2 characters',
    },
    {
      name: 'companyName',
      label: 'Company Name',
      type: 'text',
      readOnly: isViewMode,
      validate: validateCompanyName,
      tooltip: 'Optional company name'
    },
    {
      name: 'address',
      label: 'Address',
      type: 'text',
      multiline: true,
      rows: 2,
      readOnly: isViewMode,
      tooltip: 'Customer address'
    },
    {
      name: 'companyAddress',
      label: 'Company Address',
      type: 'text',
      multiline: true,
      rows: 2,
      readOnly: isViewMode,
      tooltip: 'Company address'
    },
    {
      name: 'telephoneNumber',
      label: 'Telephone Number',
      type: 'text',
      readOnly: isViewMode,
      validate: validatePhoneNumber,
      tooltip: 'Contact phone number'
    },
    {
      name: 'fax',
      label: 'Fax Number',
      type: 'text',
      readOnly: isViewMode,
      validate: validateFax,
      tooltip: 'Fax number'
    },
    {
      name: 'ntn',
      label: 'NTN',
      type: 'text',
      readOnly: isViewMode,
      validate: validateNtn,
      tooltip: 'National Tax Number'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      readOnly: isViewMode,
      validate: validateEmail,
      tooltip: 'Customer email address'
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

  // Search handlers - simplified
  const handleSearchChange = React.useCallback((event, newValue) => {
    console.log('🔄 Search change triggered:', { newValue, type: typeof newValue });
    
    if (newValue && typeof newValue === 'object') {
      // User selected from dropdown
      const searchText = newValue.customerName || '';
      console.log('🎯 Customer selected from dropdown:', searchText);
      
      setSearchState({
        query: searchText,
        isActive: true,
        dropdownOptions: [],
        isLoadingDropdown: false,
      });
      
      // Reset pagination
      setPaginationModel(prev => ({ ...prev, page: 0 }));
      
    } else if (typeof newValue === 'string') {
      // User cleared or typed something
      const searchText = newValue.trim();
      
      if (searchText.length === 0) {
        // Clear search
        setSearchState({
          query: '',
          isActive: false,
          dropdownOptions: [],
          isLoadingDropdown: false,
        });
        setPaginationModel(prev => ({ ...prev, page: 0 }));
      } else {
        // Update search query but don't search table yet (wait for selection or enter)
        setSearchState(prev => ({
          ...prev,
          query: searchText,
          isActive: false, // Don't activate table search until user selects or presses enter
        }));
      }
    }
  }, []);

  const handleSearchInputChange = React.useCallback((event, newInputValue) => {
    if (typeof newInputValue === 'string') {
      const trimmedValue = newInputValue.trim();
      console.log('⌨️ Input change:', trimmedValue);
      
      // Update the input value in state
      setSearchState(prev => ({
        ...prev,
        query: trimmedValue,
      }));
      
      // Trigger dropdown search if enough characters
      if (trimmedValue.length >= 2) {
        debouncedDropdownSearch(trimmedValue);
      } else {
        setSearchState(prev => ({
          ...prev,
          dropdownOptions: [],
          isLoadingDropdown: false,
        }));
      }
    }
  }, [debouncedDropdownSearch]);

  const handleSearchKeyDown = React.useCallback((event) => {
    if (event.key === 'Enter') {
      const searchText = searchState.query.trim();
      if (searchText.length >= 2) {
        console.log('⏎ Enter pressed, searching for:', searchText);
        setSearchState(prev => ({
          ...prev,
          isActive: true,
          dropdownOptions: [],
        }));
        setPaginationModel(prev => ({ ...prev, page: 0 }));
      }
    }
  }, [searchState.query]);

  const handleClearSearch = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    setSearchState({
      query: '',
      isActive: false,
      dropdownOptions: [],
      isLoadingDropdown: false,
    });
    
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  // Action handlers
  const handleView = React.useCallback((customerData) => {
    if (!canRead) return;
    setSelectedCustomer(customerData);
    setModalMode('view');
    setModalOpen(true);
  }, [canRead]);

  const handleEdit = React.useCallback((customerData) => {
    if (!canUpdate) return;
    setSelectedCustomer(customerData);
    setModalMode('edit');
    setModalOpen(true);
  }, [canUpdate]);

  const handleDelete = React.useCallback((customerData) => {
    if (!canDelete) return;
    setCustomerToDelete(customerData);
    setDeleteDialogOpen(true);
  }, [canDelete]);

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    
    setIsLoading(true);
    setDeleteDialogOpen(false);
    
    try {
      await del(`/api/customers/${customerToDelete.id}`);

      toast.success(`Customer "${customerToDelete.customerName}" deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Reload current view
      if (searchState.isActive) {
        searchCustomers(searchState.query);
      } else {
        loadCustomers();
      }
    } catch (deleteError) {
      toast.error(`Failed to delete customer: ${deleteError.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
      setCustomerToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  const handleCreate = React.useCallback(() => {
    if (!canCreate) return;
    setSelectedCustomer({});
    setModalMode('create');
    setModalOpen(true);
  }, [canCreate]);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading && canRead) {
      if (searchState.isActive) {
        searchCustomers(searchState.query);
      } else {
        loadCustomers();
      }
    }
  }, [isLoading, canRead, searchState.isActive, searchState.query, searchCustomers, loadCustomers]);

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
        customerName: formData.customerName,
        companyName: formData.companyName,
        address: formData.address,
        companyAddress: formData.companyAddress,
        telephoneNumber: formData.telephoneNumber,
        fax: formData.fax,
        ntn: formData.ntn,
        email: formData.email,
      };

      let response;
      
      if (modalMode === 'create') {
        response = await post('/api/customers', submitData);
      } else {
        response = await put(`/api/customers/${selectedCustomer.id}`, submitData);
      }

      const successMessage = modalMode === 'create' 
        ? 'Customer created successfully!' 
        : 'Customer updated successfully!';
      
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setModalOpen(false);
      
      // Reload current view
      if (searchState.isActive) {
        searchCustomers(searchState.query);
      } else {
        loadCustomers();
      }
    } catch (submitError) {
      let errorMessage = `Failed to ${modalMode} customer`;
      
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

  // Column definitions
  const columns = React.useMemo(
    () => [
      // { 
      //   field: 'id', 
      //   headerName: 'ID',
      //   width: 70,
      //   align: 'left',
      //   headerAlign: 'left',
      //   renderCell: (params) => (
      //     <Typography 
      //       variant="body2" 
      //       sx={{ 
      //         display: 'flex', 
      //         alignItems: 'center', 
      //         height: '100%',
      //         lineHeight: 1.5
      //       }}
      //     >
      //       {params.value}
      //     </Typography>
      //   ),
      // },
      {
        field: 'customerName',
        headerName: 'Purchaser',
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
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'companyName',
        headerName: 'Company',
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
            {params.value || 'N/A'}
          </Typography>
        ),
      },
      {
        field: 'telephoneNumber',
        headerName: 'Phone',
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
        field: 'ntn',
        headerName: 'NTN',
        width: 120,
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
        field: 'email',
        headerName: 'Email',
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
            {params.value || 'N/A'}
          </Typography>
        ),
      },
      {
        field: 'address',
        headerName: 'Address',
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
              lineHeight: 1.5,
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap' 
            }}
          >
            {params.value || 'N/A'}
          </Typography>
        ),
      },
      {
        field: 'createdAt',
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

  const pageTitle = 'Customer Management';

  // Permission check
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

      {/* Search Component */}
      {canRead && (
        <Box sx={{ mb: 2, maxWidth: 400, position: 'relative' }}>
          <Autocomplete
            freeSolo
            options={searchState.dropdownOptions}
            getOptionLabel={(option) => {
              if (typeof option === 'string') return option;
              return option.customerName || '';
            }}
            value={searchState.query}
            onChange={handleSearchChange}
            onInputChange={handleSearchInputChange}
            inputValue={searchState.query}
            loading={searchState.isLoadingDropdown}
            loadingText="Searching customers..."
            noOptionsText={searchState.query.length < 2 ? "Type at least 2 characters to search" : "No customers found"}
            filterOptions={(options) => options}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search by customer name"
                placeholder="Type customer name and press Enter..."
                size="small"
                onKeyDown={handleSearchKeyDown}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchState.isLoadingDropdown ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : searchState.query ? (
                        <IconButton
                          size="small"
                          onClick={handleClearSearch}
                          edge="end"
                        >
                          <Clear />
                        </IconButton>
                      ) : null}
                      {params.InputProps.endAdornment}
                    </InputAdornment>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id}>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {option.customerName}
                  </Typography>
                  {option.companyName && (
                    <Typography variant="body2" color="text.secondary">
                      {option.companyName}
                    </Typography>
                  )}
                  {option.telephoneNumber && (
                    <Typography variant="caption" color="text.secondary">
                      📞 {option.telephoneNumber}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          />
          {searchState.isActive && (
            <Chip
              label={`Searching: "${searchState.query}"`}
              onDelete={handleClearSearch}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
            />
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
        
        // Actions
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

      {/* Dynamic Modal */}
      <DynamicModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        title={`${modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Edit' : 'View'} Customer`}
        initialData={selectedCustomer || {}}
        fields={getCustomerFields(modalMode === 'view')}
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
            Are you sure you want to delete the customer <strong>"{customerToDelete?.customerName}"</strong>?
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

      {/* Toast Container */}
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