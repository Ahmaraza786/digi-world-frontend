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
  Card,
  CardContent,
  Divider,
  Grid,
  Paper,
  InputAdornment,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  InputAdornment as MUIInputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Stack from '@mui/material/Stack';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../auth/AuthContext';
import ReusableDataTable from '../components/ReusableData';
import PageContainer from '../components/PageContainer';
import DynamicModal from '../components/DynamicModel';
import { BASE_URL } from "../constants/Constants";
import { useApi } from '../hooks/useApi';
import { Add, Delete, Edit, Search, Clear, Visibility, AttachFile, CloudUpload, GetApp } from '@mui/icons-material';

const INITIAL_PAGE_SIZE = 10;

export default function InvoiceManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, hasPermission, token } = useAuth();
  
  // Check user permissions
  const canRead = user?.permissions?.invoice?.includes('read') || false;
  const canCreate = user?.permissions?.invoice?.includes('create') || false;
  const canUpdate = user?.permissions?.invoice?.includes('update') || false;
  const canDelete = user?.permissions?.invoice?.includes('delete') || false;

  const { get, post, put, del } = useApi();

  const [rowsState, setRowsState] = React.useState({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = React.useState(null);
  const [viewingPdfInvoiceId, setViewingPdfInvoiceId] = React.useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState('view');
  const [selectedInvoice, setSelectedInvoice] = React.useState(null);
  const [currentFormData, setCurrentFormData] = React.useState({});

  // Memoized form data change handler
  const handleFormDataChange = React.useCallback((data) => {
    setCurrentFormData(data);
  }, []);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = React.useState(null);

  // PDF preview modal state
  const [pdfPreviewOpen, setPdfPreviewOpen] = React.useState(false);
  const [pdfPreviewData, setPdfPreviewData] = React.useState(null);
  const [loadingPdfPreview, setLoadingPdfPreview] = React.useState(false);

  // Export All modal state
  const [exportAllDialogOpen, setExportAllDialogOpen] = React.useState(false);
  const [exportDateRange, setExportDateRange] = React.useState({
    startDate: '',
    endDate: ''
  });
  const [exportAllLoading, setExportAllLoading] = React.useState(false);

  // Form submit trigger
  const [submitTrigger, setSubmitTrigger] = React.useState(0);

  // Data for dropdowns
  const [customers, setCustomers] = React.useState([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState([]);
  const [banks, setBanks] = React.useState([]);
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);
  const [loadingPurchaseOrders, setLoadingPurchaseOrders] = React.useState(false);
  const [loadingBanks, setLoadingBanks] = React.useState(false);
  
  // Centralized state management
  const [currentModalCustomer, setCurrentModalCustomer] = React.useState(null);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = React.useState(null);
  const [formData, setFormData] = React.useState({});
  const [formErrors, setFormErrors] = React.useState({});

  // Debug: Track purchase orders state changes
  React.useEffect(() => {
    console.log('🎯 MAIN COMPONENT: purchaseOrders state updated', {
      length: purchaseOrders.length,
      items: purchaseOrders.map(po => ({ id: po.id, po_no: po.purchase_order_no })),
      trigger: 'STATE_UPDATE'
    });
  }, [purchaseOrders]);

  // Centralized form management
  // const handleFieldChange = React.useCallback((fieldName, value) => {
  //   console.log('🔄 Field change:', fieldName, value);
  //   setFormData(prev => ({ ...prev, [fieldName]: value }));
    
  //   // Clear error for this field
  //   if (formErrors[fieldName]) {
  //     setFormErrors(prev => ({ ...prev, [fieldName]: '' }));
  //   }
  // }, [formErrors]);
  const handleFieldChange = React.useCallback((fieldName, value) => {
    console.log('🔄 Field change:', fieldName, value);
    setFormData((prev) => {
      // Avoid updating state if the value hasn't changed
      if (prev[fieldName] === value) {
        return prev;
      }
      return { ...prev, [fieldName]: value };
    });
  
    // Clear error for this field
    if (formErrors[fieldName]) {
      setFormErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  }, [formErrors]);
  const validateForm = React.useCallback(() => {
    const newErrors = {};
    
    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.total_amount || formData.total_amount <= 0) newErrors.total_amount = 'Total amount must be greater than 0';
    if (!formData.invoice_type) newErrors.invoice_type = 'Invoice type is required';
    if (!formData.status) newErrors.status = 'Status is required';
    
    // Validate payment fields when status is paid
    if (formData.status === 'paid') {
      if (!formData.bank || formData.bank.trim() === '') {
        newErrors.bank = 'Bank is required when status is paid';
      }
      if (!formData.dw_bank || formData.dw_bank.trim() === '') {
        newErrors.dw_bank = 'DW Bank is required when status is paid';
      }
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Initialize form data when modal opens
  React.useEffect(() => {
    if (modalOpen) {
      if (modalMode === 'create') {
        setFormData({
          invoice_type: 'material', // Default to material
          status: 'unpaid',
          with_hold_tax: true
        });
        setFormErrors({});
      } else if (modalMode === 'edit' && selectedInvoice) {
        console.log('🔄 Setting form data for edit:', selectedInvoice);
        console.log('🔄 Total amount:', selectedInvoice.total_amount);
        console.log('🔄 Description:', selectedInvoice.description);
        setFormData(selectedInvoice);
        setFormErrors({});
      } else if (modalMode === 'view' && selectedInvoice) {
        console.log('🔄 Setting form data for view:', selectedInvoice);
        setFormData(selectedInvoice);
        setFormErrors({});
      }
    }
  }, [modalOpen, modalMode, selectedInvoice]);

  // Update form data when customer changes
  React.useEffect(() => {
    if (currentModalCustomer && currentModalCustomer.id !== formData.customer?.id) {
      setFormData(prev => ({ ...prev, customer: currentModalCustomer }));
    }
  }, [currentModalCustomer, formData.customer]);

  // Update form data when purchase order changes - SIMPLIFIED
  React.useEffect(() => {
    if (selectedPurchaseOrder) {
      console.log('🔄 Setting purchase order and description:', {
        purchaseOrderDescription: selectedPurchaseOrder.description
      });
      
      setFormData(prev => ({ 
        ...prev, 
        purchase_order: selectedPurchaseOrder,
        // Set description once from purchase order, then user can edit freely
        description: selectedPurchaseOrder.description || ''
      }));
    }
  }, [selectedPurchaseOrder]);

  // Calculate total cost based on invoice type and purchase order
  const calculateTotalCost = React.useCallback(() => {
    if (!formData.purchase_order?.quotation?.materials || !formData.invoice_type) {
      return 0;
    }

    const filteredMaterials = formData.purchase_order.quotation.materials.filter(material => 
      material.material_type === formData.invoice_type
    );

    if (filteredMaterials.length === 0) {
      return 0;
    }

    return filteredMaterials.reduce((total, material) => {
      const quantity = parseFloat(material.quantity) || 0;
      const unitPrice = parseFloat(material.unit_price) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  }, [formData.purchase_order, formData.invoice_type]);

  // Update total cost when purchase order or invoice type changes
  React.useEffect(() => {
    if (formData.purchase_order && formData.invoice_type) {
      const calculatedTotal = calculateTotalCost();
      setFormData(prev => ({ ...prev, total_amount: calculatedTotal }));
    }
  }, [formData.purchase_order, formData.invoice_type, calculateTotalCost]);

  // Auto-calculate total amount for edit/view modes when invoice data is loaded
  React.useEffect(() => {
    if (modalOpen && (modalMode === 'edit' || modalMode === 'view') && selectedInvoice) {
      console.log('🔄 Auto-calculating total for edit/view mode');
      console.log('🔄 Selected invoice data:', selectedInvoice);
      
      // For edit/view mode, use the existing total_amount from the invoice
      // The total should already be calculated and stored in the database
      if (selectedInvoice.total_amount) {
        console.log('🔄 Using existing total amount:', selectedInvoice.total_amount);
        setFormData(prev => ({ 
          ...prev, 
          total_amount: parseFloat(selectedInvoice.total_amount) 
        }));
      }
    }
  }, [modalOpen, modalMode, selectedInvoice]);
  // Search state - separate fields, check URL params first
  const [searchState, setSearchState] = React.useState(() => {
    const urlStatus = searchParams.get('status');
    return {
      invoiceNo: '',
      customerName: '',
      status: urlStatus || '',
      isActive: !!urlStatus, // Set active if status is provided from URL
    };
  });

  // Date range state - check URL params first
  const [appliedDateRange, setAppliedDateRange] = React.useState(() => {
    // Check if URL has date range parameters
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');
    
    if (urlStartDate && urlEndDate) {
      return {
        startDate: urlStartDate,
        endDate: urlEndDate,
      };
    }
    
    // Default to current month if no URL params
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

  // Customer suggestions state
  const [customerSuggestions, setCustomerSuggestions] = React.useState({
    options: [],
    isLoading: false,
  });

  // Search optimization
  const [searchCache] = React.useState(new Map());
  const abortControllerRef = React.useRef(null);
  const debounceTimeoutRef = React.useRef(null);

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

  // Customer search dropdown function - for autocomplete suggestions
  const searchCustomerOptions = React.useCallback(async (query) => {
    const trimmedQuery = query?.trim();
    
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setCustomerSuggestions(prev => ({ ...prev, options: [], isLoading: false }));
      return;
    }

    // Check cache first
    const cacheKey = `customer-dropdown-${trimmedQuery}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      setCustomerSuggestions(prev => ({ ...prev, options: cached.options, isLoading: false }));
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const newAbortController = new AbortController();
    abortControllerRef.current = newAbortController;

    setCustomerSuggestions(prev => ({ ...prev, isLoading: true }));
    
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
        
        setCustomerSuggestions(prev => ({ ...prev, options: response.customers }));
      } else {
        setCustomerSuggestions(prev => ({ ...prev, options: [] }));
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error searching customers:', error);
        setCustomerSuggestions(prev => ({ ...prev, options: [] }));
      }
    } finally {
      setCustomerSuggestions(prev => ({ ...prev, isLoading: false }));
      abortControllerRef.current = null;
    }
  }, [get, searchCache]);

  // Debounced customer search
  const debouncedCustomerSearch = React.useCallback((query) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      searchCustomerOptions(query);
    }, 300);
  }, [searchCustomerOptions]);

  // Date range handlers
  const handleTempDateChange = React.useCallback((field, value) => {
    setTempDateRange((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleApplyDateRange = React.useCallback(() => {
    const prev = appliedDateRange;
    if (
      tempDateRange.startDate === prev.startDate &&
      tempDateRange.endDate === prev.endDate
    ) {
      return;
    }
    console.log('🔄 Applying date range:', {
      oldRange: prev,
      newRange: tempDateRange
    });
    setAppliedDateRange({
      startDate: tempDateRange.startDate,
      endDate: tempDateRange.endDate,
    });
  }, [tempDateRange.startDate, tempDateRange.endDate, appliedDateRange]);

  // Perform search with multiple parameters
  const performSearch = React.useCallback(async (searchParams, dateRange = appliedDateRange) => {
    if (!canRead) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      let apiUrl = `/api/invoices?page=${page}&size=${pageSize}`;
      
      // Add search parameters
      const params = new URLSearchParams();
      
      // Add date range parameters
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      // For invoice number, use the search parameter which searches invoice_no field
      if (searchParams.invoiceNo?.trim()) {
        params.append('search', searchParams.invoiceNo.trim());
      }
      
      // For customer name, use the customer parameter for specific customer search
      if (searchParams.customerName?.trim()) {
        params.append('customer', searchParams.customerName.trim());
      }
      
      // For status, use the status parameter
      if (searchParams.status?.trim()) {
        params.append('status', searchParams.status.trim());
      }
      
      if (params.toString()) {
        apiUrl += `&${params.toString()}`;
      }
      
      console.log('🔍 Searching invoices with URL:', apiUrl);
      console.log('🔍 Search parameters:', {
        invoiceNo: searchParams.invoiceNo,
        customerName: searchParams.customerName,
        status: searchParams.status,
        startDate: appliedDateRange.startDate,
        endDate: appliedDateRange.endDate
      });
      
      const response = await get(apiUrl);
      console.log('✅ Search API response:', response);
      
      if (response.content && Array.isArray(response.content)) {
        setRowsState({
          rows: response.content,
          rowCount: response.totalElements || response.content.length,
        });
        console.log('📊 Table updated with search results');
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
      console.error('💥 Error searching invoices:', loadError);
      setError(loadError.message || 'Failed to search invoices');
      toast.error('Failed to search invoices', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead, appliedDateRange]);

  // Load customers for dropdown
  const loadCustomers = React.useCallback(async () => {
    console.log('🔄 loadCustomers called');
    setLoadingCustomers(true);
    try {
      console.log('🔄 Loading customers from /api/customers/all...');
      const customerData = await get('/api/customers/all');
      console.log('✅ Customer data received:', customerData);
      
      if (Array.isArray(customerData)) {
        console.log('✅ Setting customers from array:', customerData);
        setCustomers(customerData);
      } else if (customerData.data && Array.isArray(customerData.data)) {
        console.log('✅ Setting customers from data property:', customerData.data);
        setCustomers(customerData.data);
      } else {
        console.log('⚠️ No valid customer data found, setting empty array');
        setCustomers([]);
      }
    } catch (error) {
      console.error('❌ Error loading customers:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error('Failed to load customers', {
        position: "top-right",
        autoClose: 3000,
      });
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, [get]);

  // Load banks for dropdown
  const loadBanks = React.useCallback(async () => {
    console.log('🔄 loadBanks called');
    setLoadingBanks(true);
    try {
      console.log('🔄 Loading banks from /api/banks...');
      const bankData = await get('/api/banks');
      console.log('✅ Bank data received:', bankData);
      
      if (bankData.success && Array.isArray(bankData.banks)) {
        console.log('✅ Setting banks from response:', bankData.banks);
        setBanks(bankData.banks);
      } else if (Array.isArray(bankData)) {
        console.log('✅ Setting banks from array:', bankData);
        setBanks(bankData);
      } else {
        console.log('⚠️ No valid bank data found, setting empty array');
        setBanks([]);
      }
    } catch (error) {
      console.error('❌ Error loading banks:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error('Failed to load banks', {
        position: "top-right",
        autoClose: 3000,
      });
      setBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  }, [get]);

  // Load purchase orders by customer ID
// Load purchase orders by customer ID
// Load purchase orders by customer ID - FIXED VERSION
const loadPurchaseOrdersByCustomer = React.useCallback(async (customerId) => {
  console.log('🔄 loadPurchaseOrdersByCustomer called with customerId:', customerId);
  if (!customerId) {
    console.log('🔄 No customerId provided, clearing purchase orders');
    setPurchaseOrders([]);
    setSelectedPurchaseOrder(null);
    return;
  }

  // Don't prevent calls if already loading - let it complete
  setLoadingPurchaseOrders(true);
  try {
    console.log('🔄 Making API call to /api/invoices/purchase-orders/customer/' + customerId);
    const response = await get(`/api/invoices/purchase-orders/customer/${customerId}`);
    console.log('✅ Purchase orders API response:', response);
    
    if (response.success && response.purchaseOrders) {
      console.log('✅ Setting purchase orders:', response.purchaseOrders);
      setPurchaseOrders(response.purchaseOrders);
      console.log('✅ Purchase orders state should now be updated');
    } else {
      console.log('⚠️ No purchase orders found in response, setting empty array');
      setPurchaseOrders([]);
    }
  } catch (error) {
    console.error('❌ Error loading purchase orders:', error);
    console.error('❌ Error details:', error.response?.data);
    toast.error('Failed to load purchase orders', {
      position: "top-right",
      autoClose: 3000,
    });
    setPurchaseOrders([]);
  } finally {
    setLoadingPurchaseOrders(false);
  }
}, [get]);
  // Note: loadPurchaseOrderDetails function removed - we now use purchase order data directly from the API response


  // Load customers and banks when modal opens
  React.useEffect(() => {
    console.log('🔍 useEffect triggered:', { modalOpen, modalMode, user: !!user, token: !!token });
    if (modalOpen && (modalMode === 'create' || modalMode === 'edit')) {
      console.log('✅ Modal opened, loading customers and banks...');
      if (user && token) {
        console.log('✅ User and token available, calling loadCustomers and loadBanks');
        loadCustomers();
        loadBanks();
      } else {
        console.log('❌ User or token not available:', { user: !!user, token: !!token });
      }
    }
  }, [modalOpen, modalMode, loadCustomers, loadBanks, user, token]);

  // Load purchase orders when editing an invoice with a customer
  React.useEffect(() => {
    if (modalOpen && modalMode === 'edit' && selectedInvoice && selectedInvoice.customer) {
      console.log('Edit mode - setting customer and purchase order from invoice data');
      setCurrentModalCustomer(selectedInvoice.customer);
      
      // Don't load purchase orders for edit mode - use the existing purchase order from invoice data
      if (selectedInvoice.purchaseOrder) {
        setSelectedPurchaseOrder(selectedInvoice.purchaseOrder);
        setPurchaseOrders([selectedInvoice.purchaseOrder]); // Set only the current purchase order
      }
    } else if (modalOpen && modalMode === 'view' && selectedInvoice && selectedInvoice.customer) {
      console.log('View mode - setting customer and purchase order from invoice data');
      setCurrentModalCustomer(selectedInvoice.customer);
      
      // Don't load purchase orders for view mode - use the existing purchase order from invoice data
      if (selectedInvoice.purchaseOrder) {
        setSelectedPurchaseOrder(selectedInvoice.purchaseOrder);
        setPurchaseOrders([selectedInvoice.purchaseOrder]); // Set only the current purchase order
      }
    } else if (modalOpen && modalMode === 'create') {
      // Clear purchase orders when creating new invoice
      setCurrentModalCustomer(null);
      setPurchaseOrders([]);
      setSelectedPurchaseOrder(null);
    }
  }, [modalOpen, modalMode, selectedInvoice]);
// Load purchase orders when customer changes in modal - ONLY for create mode
React.useEffect(() => {
  console.log('🔄 useEffect triggered for customer change:', {
    modalOpen,
    modalMode,
    currentModalCustomer,
    customerId: currentModalCustomer?.id,
    currentPurchaseOrdersLength: purchaseOrders.length
  });
  
  // Only load purchase orders for create mode, not for edit/view mode
  if (modalOpen && modalMode === 'create') {
    if (currentModalCustomer && currentModalCustomer.id) {
      console.log('🔄 Create mode - Modal customer changed, loading purchase orders:', currentModalCustomer.id);
      console.log('🔄 Current purchase orders before loading:', purchaseOrders);
      loadPurchaseOrdersByCustomer(currentModalCustomer.id);
    }
  }
}, [currentModalCustomer, modalOpen, modalMode, loadPurchaseOrdersByCustomer]);
  // Validation functions
  const validateCustomer = (customer) => {
    console.log('Validating customer:', customer);
    if (!customer) return 'Customer is required';
    return '';
  };

  const validateTotalAmount = (amount) => {
    if (!amount || amount <= 0) return 'Total amount must be greater than 0';
    return '';
  };

  const validateStatus = (status) => {
    if (!status) return 'Status is required';
    if (!['unpaid', 'paid'].includes(status)) return 'Invalid status';
    return '';
  };

  const validateInvoiceType = (type) => {
    if (!type) return 'Invoice type is required';
    if (!['material', 'service'].includes(type)) return 'Invalid invoice type';
    return '';
  };


  const validateVoucherNo = (voucherNo) => {
    if (voucherNo && voucherNo.length > 100) return 'Voucher number must be less than 100 characters';
    return '';
  };

  const validateBank = (bank, formData) => {
    if (formData && formData.status === 'paid') {
      if (!bank || bank.trim() === '') return 'Bank is required when status is paid';
    }
    if (bank && bank.length > 100) return 'Bank name must be less than 100 characters';
    return '';
  };

  const validateDwBank = (dwBank, formData) => {
    if (formData && formData.status === 'paid') {
      if (!dwBank || dwBank.trim() === '') return 'DW Bank is required when status is paid';
    }
    if (dwBank && dwBank.length > 100) return 'DW Bank must be less than 100 characters';
    return '';
  };

  // Custom Customer Selection Component
  const CustomerSelectionComponent = ({ value, onChange, isViewMode, availableCustomers }) => {
    const [customerSearch, setCustomerSearch] = React.useState('');
    const [selectedCustomer, setSelectedCustomer] = React.useState(null);
  
    React.useEffect(() => {
      console.log('🔄 CustomerSelectionComponent - value received:', value);
      
      if (value) {
        if (typeof value === 'string') {
          const matchingCustomer = availableCustomers.find(customer => 
            customer.customerName === value || 
            `${customer.customerName}${customer.companyName ? ` (${customer.companyName})` : ''}` === value
          );
          console.log('🔄 Found matching customer:', matchingCustomer);
          setSelectedCustomer(matchingCustomer || null);
        } else if (value.id) {
          const exactMatch = availableCustomers.find(customer => customer.id === value.id);
          console.log('🔄 Found exact customer match by ID:', exactMatch);
          setSelectedCustomer(exactMatch || value);
        } else {
          setSelectedCustomer(value);
        }
      } else {
        setSelectedCustomer(null);
      }
    }, [value, availableCustomers]);
  
    // FIXED: Remove the state updates that cause re-renders
    const handleCustomerSelect = React.useCallback((customer) => {
      if (isViewMode) return;
      console.log('🔄 Selecting customer:', customer);
      setSelectedCustomer(customer);
      onChange(customer); // Let parent handle the state updates
    }, [isViewMode, onChange]);
  
    const filteredCustomers = availableCustomers.filter(customer => {
      if (!customer) return false;
      const searchTerm = customerSearch.toLowerCase();
      return (
        (customer.customerName && customer.customerName.toLowerCase().includes(searchTerm)) ||
        (customer.companyName && customer.companyName.toLowerCase().includes(searchTerm))
      );
    });
  
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Customer
        </Typography>
        
        {!isViewMode ? (
          <Box>
            <Autocomplete
              options={filteredCustomers}
              getOptionLabel={(option) => `${option?.customerName || 'Unknown'}${option?.companyName ? ` (${option.companyName})` : ''}`}
              value={selectedCustomer}
              onChange={(event, newValue) => handleCustomerSelect(newValue)}
              inputValue={customerSearch}
              onInputChange={(event, newInputValue) => {
                setCustomerSearch(newInputValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select purchaser"
                  placeholder="Type to search..."
                  size="small"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCustomers && <CircularProgress color="inherit" size={20} />}
                        {!loadingCustomers && availableCustomers.length === 0 && (
                          <IconButton
                            size="small"
                            onClick={loadCustomers}
                            title="Retry loading customers"
                            sx={{ mr: 1 }}
                          >
                            <Search />
                          </IconButton>
                        )}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              loading={loadingCustomers}
              noOptionsText={
                loadingCustomers 
                  ? "Loading customers..." 
                  : availableCustomers.length === 0 
                    ? "No customers available. Click refresh to retry." 
                    : "No customers found"
              }
            />
          </Box>
        ) : (
          <TextField
            label="Purchaser"
            value={
              selectedCustomer 
                ? `${selectedCustomer.customerName}${selectedCustomer.companyName ? ` (${selectedCustomer.companyName})` : ''}`
                : (typeof value === 'string' ? value : '')
            }
            disabled
            fullWidth
            size="small"
          />
        )}
  
        {(selectedCustomer || (typeof value === 'string' && value)) && (
          <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            {selectedCustomer ? (
              <>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Name:</strong> {selectedCustomer.customerName}
                </Typography>
                {selectedCustomer.companyName && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Company:</strong> {selectedCustomer.companyName}
                  </Typography>
                )}
                {selectedCustomer.telephoneNumber && (
                  <Typography variant="body2">
                    <strong>Phone:</strong> {selectedCustomer.telephoneNumber}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2">
                <strong>Customer:</strong> {value}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  };
// Fixed Purchase Order Selection Component
const PurchaseOrderSelectionComponent = React.memo(({ 
  value, 
  onChange, 
  isViewMode, 
  selectedCustomer, 
  availablePurchaseOrders, 
  isLoadingPurchaseOrders, 
  onPurchaseOrderChange 
}) => {
  const [internalSelectedPO, setInternalSelectedPO] = React.useState(value || null);

  console.log('🔍 PO SELECTION RENDER:', {
    component: 'PurchaseOrderSelectionComponent',
    availablePurchaseOrdersCount: availablePurchaseOrders?.length,
    selectedCustomer: selectedCustomer?.id,
    internalSelectedPO: internalSelectedPO?.id,
    isLoading: isLoadingPurchaseOrders
  });

  React.useEffect(() => {
    console.log('🔄 PO SELECTION: value prop changed', {
      oldValue: internalSelectedPO?.id,
      newValue: value?.id,
      trigger: 'VALUE_PROP_CHANGE'
    });
    setInternalSelectedPO(value || null);
  }, [value]);

  React.useEffect(() => {
    console.log('🔄 PO SELECTION: availablePurchaseOrders changed', {
      oldCount: availablePurchaseOrders?.length,
      customer: selectedCustomer?.id,
      trigger: 'AVAILABLE_POS_CHANGE'
    });
  }, [availablePurchaseOrders]);

  const previousCustomerId = React.useRef(selectedCustomer?.id);
  
  React.useEffect(() => {
    if (previousCustomerId.current !== selectedCustomer?.id && selectedCustomer && !isViewMode) {
      console.log('🔄 PO SELECTION: Customer changed, resetting PO', {
        previousCustomer: previousCustomerId.current,
        newCustomer: selectedCustomer?.id,
        trigger: 'CUSTOMER_CHANGE'
      });
      setInternalSelectedPO(null);
      if (onChange) onChange(null);
    }
    previousCustomerId.current = selectedCustomer?.id;
  }, [selectedCustomer?.id, isViewMode, onChange]);

  const handlePurchaseOrderSelect = React.useCallback((purchaseOrder) => {
    if (isViewMode) return;
    console.log('🎯 PO SELECTION: User selected PO', {
      purchaseOrder: purchaseOrder?.id,
      purchaseOrderNo: purchaseOrder?.purchase_order_no,
      trigger: 'USER_SELECTION'
    });
    
    if (purchaseOrder === undefined) {
      return;
    }
    
    setInternalSelectedPO(purchaseOrder);
    if (onChange) onChange(purchaseOrder);
    
    if (onPurchaseOrderChange) {
      onPurchaseOrderChange(purchaseOrder);
    }
  }, [isViewMode, onChange, onPurchaseOrderChange]);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
        Purchase Order (Optional)
      </Typography>
      
      {!isViewMode ? (
        <Autocomplete
          key={`purchase-orders-${selectedCustomer?.id || 'no-customer'}-${availablePurchaseOrders?.length || 0}`}
          options={availablePurchaseOrders || []}
          getOptionLabel={(option) => option ? `${option.purchase_order_no} - ${option.customer}` : ''}
          value={internalSelectedPO}
          onChange={(event, newValue) => {
            console.log('🎯 AUTCOMPLETE CHANGE:', { newValue: newValue?.id });
            handlePurchaseOrderSelect(newValue);
          }}
          isOptionEqualToValue={(option, value) => option?.id === value?.id}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select purchase order"
              placeholder={selectedCustomer ? "Select a purchase order..." : "Select a customer first"}
              size="small"
              fullWidth
              disabled={!selectedCustomer || isLoadingPurchaseOrders}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoadingPurchaseOrders && (
                      <CircularProgress color="inherit" size={20} sx={{ mr: 1 }} />
                    )}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          loading={isLoadingPurchaseOrders}
          noOptionsText={
            !selectedCustomer 
              ? "Please select a customer first" 
              : isLoadingPurchaseOrders 
                ? "Loading purchase orders..." 
                : (availablePurchaseOrders || []).length === 0 
                  ? "No purchase orders found for this customer" 
                  : "No purchase orders available"
          }
        />
      ) : (
        <TextField
          label="Purchase Order"
          value={internalSelectedPO ? `${internalSelectedPO.purchase_order_no} - ${internalSelectedPO.customer}` : 'None'}
          disabled
          fullWidth
          size="small"
        />
      )}

      {internalSelectedPO && (
        <Box sx={{ mt: 1, p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>PO Number:</strong> {internalSelectedPO.purchase_order_no}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Customer:</strong> {internalSelectedPO.customer}
          </Typography>
          <Typography variant="body2">
            <strong>Status:</strong> {internalSelectedPO.status}
          </Typography>
        </Box>
      )}
    </Box>
  );
});
  // Purchase Order Details Display Component
  const PurchaseOrderDetailsComponent = ({ purchaseOrderDetails, isViewMode, invoiceType }) => {
    if (!purchaseOrderDetails) return null;

    // Filter materials based on invoice type
    const filteredMaterials = purchaseOrderDetails.quotation?.materials?.filter(material => {
      if (!invoiceType) return true; // Show all if no invoice type selected
      return material.material_type === invoiceType;
    }) || [];

    return (
      <Box sx={{ mb: 2, p: 2, bgcolor: '#f0f8ff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#1976d2' }}>
          Purchase Order Details
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>PO Number:</strong> {purchaseOrderDetails.purchase_order_no}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Customer:</strong> {purchaseOrderDetails.customer}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Status:</strong> {purchaseOrderDetails.status}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            {purchaseOrderDetails.quotation && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Quotation:</strong> {purchaseOrderDetails.quotation.title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Quotation Total:</strong> PKR {purchaseOrderDetails.quotation.total_price}
                </Typography>
              </>
            )}
          </Grid>
        </Grid>

        {filteredMaterials.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              {invoiceType === 'material' ? 'Materials:' : invoiceType === 'service' ? 'Services:' : 'Items:'}
            </Typography>
            {filteredMaterials.map((material, index) => (
              <Box key={index} sx={{ mb: 1, p: 1, bgcolor: '#ffffff', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>{material.material_name}</strong> - Qty: {material.quantity} {material.unit} - PKR {material.unit_price}
                  {material.material_type && (
                    <Chip 
                      label={material.material_type} 
                      size="small" 
                      variant="outlined"
                      sx={{ ml: 1, fontSize: '0.7rem' }}
                      color={material.material_type === 'material' ? 'primary' : 'secondary'}
                    />
                  )}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {invoiceType && filteredMaterials.length === 0 && purchaseOrderDetails.quotation?.materials?.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3cd', borderRadius: 1, border: '1px solid #ffeaa7' }}>
            <Typography variant="body2" color="warning.main">
              <strong>No {invoiceType}s found in this purchase order.</strong> This purchase order contains materials of different types.
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Custom Total Amount Component
  const TotalAmountComponent = ({ value, onChange, isViewMode, purchaseOrderDetails, invoiceType }) => {
    const [totalAmount, setTotalAmount] = React.useState(value || '');

    // Calculate total from filtered materials based on invoice type
    const calculateFilteredTotal = React.useCallback(() => {
      if (!purchaseOrderDetails?.quotation?.materials || !invoiceType) {
        return null;
      }

      const filteredMaterials = purchaseOrderDetails.quotation.materials.filter(material => 
        material.material_type === invoiceType
      );

      if (filteredMaterials.length === 0) {
        return 0;
      }

      return filteredMaterials.reduce((total, material) => {
        const quantity = parseFloat(material.quantity) || 0;
        const unitPrice = parseFloat(material.unit_price) || 0;
        return total + (quantity * unitPrice);
      }, 0);
    }, [purchaseOrderDetails, invoiceType]);

    // Auto-calculate total when invoice type or purchase order details change
    React.useEffect(() => {
      if (purchaseOrderDetails && invoiceType) {
        const calculatedTotal = calculateFilteredTotal();
        if (calculatedTotal !== null && calculatedTotal > 0) {
          setTotalAmount(calculatedTotal);
          onChange(calculatedTotal);
        }
      } else if (purchaseOrderDetails?.quotation?.total_price && !invoiceType && !value) {
        // Fallback to original total if no invoice type is selected
        const suggestedAmount = parseFloat(purchaseOrderDetails.quotation.total_price);
        setTotalAmount(suggestedAmount);
        onChange(suggestedAmount);
      }
    }, [purchaseOrderDetails, invoiceType, calculateFilteredTotal, value]);

    React.useEffect(() => {
      setTotalAmount(value || '');
    }, [value]);

    const handleChange = (event) => {
      const newValue = event.target.value;
      setTotalAmount(newValue);
      onChange(newValue);
    };

    const calculatedTotal = calculateFilteredTotal();
    const hasFilteredMaterials = calculatedTotal !== null && calculatedTotal > 0;
    
    // Calculate filtered materials count for display
    const filteredMaterialsCount = purchaseOrderDetails?.quotation?.materials?.filter(material => 
      material.material_type === invoiceType
    )?.length || 0;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Total Amount
        </Typography>
        
        {!isViewMode ? (
          <TextField
            type="number"
            value={totalAmount}
            onChange={handleChange}
            placeholder="Enter total amount"
            fullWidth
            size="small"
            helperText={
              hasFilteredMaterials 
                ? `Auto-calculated from ${invoiceType}s: PKR ${calculatedTotal.toFixed(2)}`
                : purchaseOrderDetails?.quotation?.total_price 
                  ? `Suggested from purchase order: PKR ${purchaseOrderDetails.quotation.total_price}`
                  : 'Enter the total amount for this invoice'
            }
            InputProps={{
              startAdornment: <InputAdornment position="start">PKR</InputAdornment>
            }}
          />
        ) : (
          <TextField
            value={`PKR ${totalAmount || '0.00'}`}
            disabled
            fullWidth
            size="small"
          />
        )}

        {hasFilteredMaterials && (
          <Box sx={{ mt: 1, p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
              ✓ Total calculated from {filteredMaterialsCount} {invoiceType}(s): PKR {calculatedTotal.toFixed(2)}
            </Typography>
          </Box>
        )}

        {invoiceType && calculatedTotal === 0 && (
          <Box sx={{ mt: 1, p: 1, bgcolor: '#fff3cd', borderRadius: 1 }}>
            <Typography variant="body2" color="warning.main">
              ⚠ No {invoiceType}s found in this purchase order. Please enter amount manually.
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Custom Description Component - LOCAL STATE ONLY
  const DescriptionComponent = React.memo(({ value, onChange, isViewMode, purchaseOrderDetails }) => {
    // Use local state for description field only
    const [description, setDescription] = React.useState(value || '');
  
    // Initialize from purchase order description if no value exists
    React.useEffect(() => {
      if (!value && purchaseOrderDetails?.description) {
        setDescription(purchaseOrderDetails.description);
      }
    }, [purchaseOrderDetails?.description, value]);
  
    // Only sync with parent when modal opens/closes or when switching between invoices
    React.useEffect(() => {
      setDescription(value || '');
    }, [value]);
  
    const handleChange = React.useCallback((event) => {
      const newValue = event.target.value;
      setDescription(newValue); // Update local state immediately
      // Don't call onChange on every keystroke - only on blur or when needed
    }, []);
  
    const handleBlur = React.useCallback(() => {
      // Only notify parent when user finishes editing
      if (onChange) {
        onChange(description);
      }
    }, [description, onChange]);
  
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Description
        </Typography>
        {!isViewMode ? (
          <TextField
            multiline
            rows={3}
            value={description}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter invoice description"
            fullWidth
            size="small"
            helperText={
              purchaseOrderDetails?.description
                ? `Suggested from purchase order: "${purchaseOrderDetails.description}"`
                : 'Optional description for the invoice'
            }
          />
        ) : (
          <TextField
            multiline
            rows={3}
            value={description}
            disabled
            fullWidth
            size="small"
          />
        )}
      </Box>
    );
  });

  // Custom Voucher Number Component - LOCAL STATE ONLY
  const VoucherNumberComponent = React.memo(({ value, onChange, isViewMode }) => {
    const [voucherNo, setVoucherNo] = React.useState(value || '');
  
    React.useEffect(() => {
      setVoucherNo(value || '');
    }, [value]);
  
    const handleChange = React.useCallback((event) => {
      const newValue = event.target.value;
      setVoucherNo(newValue);
    }, []);
  
    const handleBlur = React.useCallback(() => {
      if (onChange) {
        onChange(voucherNo);
      }
    }, [voucherNo, onChange]);
  
    return (
      <TextField
        label="Voucher Number"
        value={voucherNo}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={isViewMode}
        fullWidth
        size="small"
      />
    );
  });

  // Custom Bank Component with Autocomplete
  const BankComponent = React.memo(({ value, onChange, isViewMode, availableBanks, isLoadingBanks }) => {
    const [bank, setBank] = React.useState(value || '');
    const [selectedBank, setSelectedBank] = React.useState(null);
  
    React.useEffect(() => {
      setBank(value || '');
      // Find matching bank object
      if (value && availableBanks.length > 0) {
        const matchingBank = availableBanks.find(b => b.bank_name === value);
        setSelectedBank(matchingBank || null);
      } else {
        setSelectedBank(null);
      }
    }, [value, availableBanks]);
  
    const handleBankSelect = React.useCallback((bank) => {
      if (isViewMode) return;
      console.log('🔄 Selecting bank:', bank);
      setSelectedBank(bank);
      setBank(bank ? bank.bank_name : '');
      if (onChange) {
        onChange(bank ? bank.bank_name : '');
      }
    }, [isViewMode, onChange]);
  
    const filteredBanks = availableBanks.filter(bankItem => {
      if (!bankItem) return false;
      const searchTerm = bank.toLowerCase();
      return bankItem.bank_name.toLowerCase().includes(searchTerm);
    });
  
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Bank *
        </Typography>
        {!isViewMode ? (
          <Autocomplete
            options={filteredBanks}
            getOptionLabel={(option) => option.bank_name || ''}
            value={selectedBank}
            onChange={(event, newValue) => handleBankSelect(newValue)}
            inputValue={bank}
            onInputChange={(event, newInputValue) => {
              setBank(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select bank"
                placeholder="Type to search banks..."
                size="small"
                fullWidth
                error={!!formErrors.bank}
                helperText={formErrors.bank || 'Required when status is paid'}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoadingBanks && <CircularProgress color="inherit" size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            loading={isLoadingBanks}
            noOptionsText={
              isLoadingBanks 
                ? "Loading banks..." 
                : availableBanks.length === 0 
                  ? "No banks available" 
                  : "No banks found"
            }
          />
        ) : (
          <TextField
            label="Bank"
            value={bank}
            disabled
            fullWidth
            size="small"
          />
        )}
      </Box>
    );
  });

  // Custom DW Bank Component with Autocomplete
  const DwBankComponent = React.memo(({ value, onChange, isViewMode, availableBanks, isLoadingBanks }) => {
    const [dwBank, setDwBank] = React.useState(value || '');
    const [selectedDwBank, setSelectedDwBank] = React.useState(null);
  
    React.useEffect(() => {
      setDwBank(value || '');
      // Find matching bank object
      if (value && availableBanks.length > 0) {
        const matchingBank = availableBanks.find(b => b.bank_name === value);
        setSelectedDwBank(matchingBank || null);
      } else {
        setSelectedDwBank(null);
      }
    }, [value, availableBanks]);
  
    const handleDwBankSelect = React.useCallback((bank) => {
      if (isViewMode) return;
      console.log('🔄 Selecting DW bank:', bank);
      setSelectedDwBank(bank);
      setDwBank(bank ? bank.bank_name : '');
      if (onChange) {
        onChange(bank ? bank.bank_name : '');
      }
    }, [isViewMode, onChange]);
  
    const filteredBanks = availableBanks.filter(bankItem => {
      if (!bankItem) return false;
      const searchTerm = dwBank.toLowerCase();
      return bankItem.bank_name.toLowerCase().includes(searchTerm);
    });
  
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          DW Bank *
        </Typography>
        {!isViewMode ? (
          <Autocomplete
            options={filteredBanks}
            getOptionLabel={(option) => option.bank_name || ''}
            value={selectedDwBank}
            onChange={(event, newValue) => handleDwBankSelect(newValue)}
            inputValue={dwBank}
            onInputChange={(event, newInputValue) => {
              setDwBank(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select DW bank"
                placeholder="Type to search banks..."
                size="small"
                fullWidth
                error={!!formErrors.dw_bank}
                helperText={formErrors.dw_bank || 'Required when status is paid'}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoadingBanks && <CircularProgress color="inherit" size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            loading={isLoadingBanks}
            noOptionsText={
              isLoadingBanks 
                ? "Loading banks..." 
                : availableBanks.length === 0 
                  ? "No banks available" 
                  : "No banks found"
            }
          />
        ) : (
          <TextField
            label="DW Bank"
            value={dwBank}
            disabled
            fullWidth
            size="small"
          />
        )}
      </Box>
    );
  });

  // Custom Deposit Date Component
  const DepositDateComponent = ({ value, onChange, isViewMode }) => {
    const [depositDate, setDepositDate] = React.useState(value ? new Date(value) : null);

    React.useEffect(() => {
      setDepositDate(value ? new Date(value) : null);
    }, [value]);

    const handleDateChange = (newDate) => {
      if (isViewMode) return;
      
      setDepositDate(newDate);
      if (newDate) {
        // Format date as YYYY-MM-DD to avoid timezone issues
        const formattedDate = newDate.toISOString().split('T')[0];
        onChange(formattedDate);
      } else {
        onChange(null);
      }
    };

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Deposit Date
        </Typography>
        
        {!isViewMode ? (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              value={depositDate}
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  placeholder: 'Select deposit date',
                  helperText: 'Optional deposit date for payment'
                }
              }}
            />
          </LocalizationProvider>
        ) : (
          <TextField
            value={depositDate ? depositDate.toLocaleDateString() : 'N/A'}
            disabled
            fullWidth
            size="small"
          />
        )}
      </Box>
    );
  };

  // Static Invoice Form Component - Uses Centralized State
  const StaticInvoiceForm = () => {
    const isViewMode = modalMode === 'view';
    
    // Debug: Log form data
    React.useEffect(() => {
      console.log('🔄 StaticInvoiceForm - formData:', formData);
      console.log('🔄 StaticInvoiceForm - total_amount:', formData.total_amount);
      console.log('🔄 StaticInvoiceForm - description:', formData.description);
    }, [formData]);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Customer Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Customer *
          </Typography>
          {!isViewMode ? (
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => `${option?.customerName || 'Unknown'}${option?.companyName ? ` (${option.companyName})` : ''}`}
              value={formData.customer || null}
              onChange={(event, newValue) => {
                handleFieldChange('customer', newValue);
                setCurrentModalCustomer(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select purchaser"
                  placeholder="Type to search..."
                  size="small"
                  fullWidth
                  error={!!formErrors.customer}
                  helperText={formErrors.customer}
                />
              )}
              loading={loadingCustomers}
              noOptionsText={loadingCustomers ? "Loading customers..." : "No customers found"}
            />
          ) : (
            <TextField
              label="Purchaser"
              value={formData.customer ? `${formData.customer.customerName}${formData.customer.companyName ? ` (${formData.customer.companyName})` : ''}` : ''}
              disabled
              fullWidth
              size="small"
            />
          )}
        </Box>

        {/* Purchase Order Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Purchase Order (Optional)
          </Typography>
          {!isViewMode ? (
            <Autocomplete
              options={purchaseOrders || []}
              getOptionLabel={(option) => option ? `${option.purchase_order_no} - ${option.customer}` : ''}
              value={formData.purchase_order || null}
              onChange={(event, newValue) => {
                console.log('🔄 Purchase order selected in StaticInvoiceForm:', {
                  newValue: newValue?.id,
                  description: newValue?.description,
                  purchaseOrderNo: newValue?.purchase_order_no
                });
                // Set purchase order - description will be auto-filled once
                setSelectedPurchaseOrder(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select purchase order"
                  placeholder={formData.customer ? "Select a purchase order..." : "Select a customer first"}
                  size="small"
                  fullWidth
                  disabled={!formData.customer || loadingPurchaseOrders}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingPurchaseOrders && <CircularProgress color="inherit" size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              loading={loadingPurchaseOrders}
              noOptionsText={
                !formData.customer 
                  ? "Please select a customer first" 
                  : loadingPurchaseOrders 
                    ? "Loading purchase orders..." 
                    : "No purchase orders found"
              }
            />
          ) : (
            <TextField
              label="Purchase Order"
              value={formData.purchase_order ? `${formData.purchase_order.purchase_order_no} - ${formData.purchase_order.customer}` : 'None'}
              disabled
              fullWidth
              size="small"
            />
          )}
        </Box>

        {/* Purchase Order Details */}
        {formData.purchase_order && (
          <Box sx={{ mb: 2, p: 2, bgcolor: '#f0f8ff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#1976d2' }}>
              Purchase Order Details
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>PO Number:</strong> {formData.purchase_order.purchase_order_no}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Customer:</strong> {formData.purchase_order.customer}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Status:</strong> {formData.purchase_order.status}
            </Typography>
            {formData.purchase_order.quotation && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Quotation:</strong> {formData.purchase_order.quotation.title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Quotation Total:</strong> PKR {formData.purchase_order.quotation.total_price}
                </Typography>
                
                {/* Show materials breakdown */}
                {formData.purchase_order.quotation.materials && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Materials Breakdown:
                    </Typography>
                    {formData.purchase_order.quotation.materials.map((material, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, bgcolor: '#ffffff', borderRadius: 1 }}>
                        <Typography variant="body2">
                          <strong>{material.material_name}</strong> - Qty: {material.quantity} {material.unit} - PKR {material.unit_price}
                          <Chip 
                            label={material.material_type} 
                            size="small" 
                            variant="outlined"
                            sx={{ ml: 1, fontSize: '0.7rem' }}
                            color={material.material_type === 'material' ? 'primary' : 'secondary'}
                          />
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* Total Amount Summary */}
        {formData.purchase_order && formData.invoice_type && (
          <Box sx={{ mb: 2, p: 2, bgcolor: '#e8f5e8', borderRadius: 1, border: '1px solid #c8e6c9' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#2e7d32' }}>
              Invoice Total Calculation
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Selected Type:</strong> {formData.invoice_type.charAt(0).toUpperCase() + formData.invoice_type.slice(1)}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Calculated Total:</strong> PKR {parseFloat(formData.total_amount || 0).toFixed(2)}
            </Typography>
            {formData.purchase_order.quotation?.materials && (
              <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#666' }}>
                Based on {formData.purchase_order.quotation.materials.filter(m => m.material_type === formData.invoice_type).length} {formData.invoice_type}(s) from purchase order
              </Typography>
            )}
          </Box>
        )}

        {/* Total Amount */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Total Amount *
          </Typography>
          <TextField
            type="number"
            value={formData.total_amount || ''}
            placeholder="Auto-calculated from purchase order"
            fullWidth
            size="small"
            error={!!formErrors.total_amount}
            helperText={
              formData.purchase_order && formData.invoice_type 
                ? `Auto-calculated from ${formData.invoice_type}s in purchase order: PKR ${parseFloat(formData.total_amount || 0).toFixed(2)}`
                : formErrors.total_amount || 'Select a purchase order and invoice type to auto-calculate'
            }
            disabled={true} // Always disabled - auto-calculated
            InputProps={{
              startAdornment: <InputAdornment position="start">PKR</InputAdornment>
            }}
          />
        </Box>

        {/* Invoice Type */}
        <FormControl fullWidth size="small" error={!!formErrors.invoice_type}>
          <InputLabel>Invoice Type *</InputLabel>
          <Select
            value={formData.invoice_type || ''}
            onChange={(e) => handleFieldChange('invoice_type', e.target.value)}
            label="Invoice Type *"
            disabled={isViewMode}
          >
            <MenuItem value="material">Material</MenuItem>
            <MenuItem value="service">Service</MenuItem>
          </Select>
          {formErrors.invoice_type && (
            <Typography color="error" variant="caption">
              {formErrors.invoice_type}
            </Typography>
          )}
        </FormControl>

        {/* Status */}
        <FormControl fullWidth size="small" error={!!formErrors.status}>
          <InputLabel>Status *</InputLabel>
          <Select
            value={formData.status || ''}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            label="Status *"
            disabled={isViewMode}
          >
            <MenuItem value="unpaid">Unpaid</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
          </Select>
          {formErrors.status && (
            <Typography color="error" variant="caption">
              {formErrors.status}
            </Typography>
          )}
        </FormControl>

        {/* Description - Using DescriptionComponent for local state management */}
        <DescriptionComponent 
          value={formData.description || ''} 
          onChange={(value) => handleFieldChange('description', value)} 
          isViewMode={isViewMode}
          purchaseOrderDetails={formData.purchase_order}
        />

        {/* Withhold Tax */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            type="checkbox"
            checked={formData.with_hold_tax || false}
            onChange={(e) => handleFieldChange('with_hold_tax', e.target.checked)}
            disabled={isViewMode}
          />
          <Typography variant="body2">With Gst</Typography>
        </Box>

        {/* Payment Fields - Show only if status is 'paid' */}
        {formData.status === 'paid' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Payment Information
            </Typography>
            
            <VoucherNumberComponent 
              value={formData.voucher_no || ''} 
              onChange={(value) => handleFieldChange('voucher_no', value)} 
              isViewMode={isViewMode}
            />

            <BankComponent 
              value={formData.bank || ''} 
              onChange={(value) => handleFieldChange('bank', value)} 
              isViewMode={isViewMode}
              availableBanks={banks}
              isLoadingBanks={loadingBanks}
            />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                Deposit Date
              </Typography>
              {!isViewMode ? (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    value={formData.deposit_date ? new Date(formData.deposit_date) : null}
                    onChange={(newDate) => {
                      if (newDate) {
                        const formattedDate = newDate.toISOString().split('T')[0];
                        handleFieldChange('deposit_date', formattedDate);
                      } else {
                        handleFieldChange('deposit_date', null);
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                        placeholder: 'Select deposit date'
                      }
                    }}
                  />
                </LocalizationProvider>
              ) : (
                <TextField
                  value={formData.deposit_date ? new Date(formData.deposit_date).toLocaleDateString() : 'N/A'}
                  disabled
                  fullWidth
                  size="small"
                />
              )}
            </Box>

            <DwBankComponent 
              value={formData.dw_bank || ''} 
              onChange={(value) => handleFieldChange('dw_bank', value)} 
              isViewMode={isViewMode}
              availableBanks={banks}
              isLoadingBanks={loadingBanks}
            />
          </Box>
        )}
      </Box>
    );
  };

  // Define invoice form fields - static fields that don't change
  const invoiceFields = React.useMemo(() => {
    const isViewMode = modalMode === 'view';
    
    return [
    {
      name: 'customer',
      label: 'Purchaser',
      type: 'custom',
      required: true,
      validate: validateCustomer,
      render: (value, onChange, isView) => (
        <CustomerSelectionComponent 
        value={value} 
        onChange={onChange} 
        isViewMode={isView}
        availableCustomers={customers}
        />
      ),
    },
    {
      name: 'purchase_order',
      label: 'Purchase Order',
      type: 'custom',
      required: false,
      render: (value, onChange, isView) => {
        console.log('🔄 Rendering PurchaseOrderSelectionComponent with purchaseOrders:', purchaseOrders);
        console.log('🔄 purchaseOrders length:', purchaseOrders?.length);
        return (
          <PurchaseOrderSelectionComponent 
            value={value} 
            onChange={onChange} 
            isViewMode={isView}
            selectedCustomer={currentModalCustomer}
            availablePurchaseOrders={purchaseOrders}
            isLoadingPurchaseOrders={loadingPurchaseOrders}
          />
        );
      },
    },
    {
      name: 'purchase_order_details',
      label: 'Purchase Order Details',
      type: 'custom',
      required: false,
      render: (value, onChange, isView, formData) => (
        <PurchaseOrderDetailsComponent 
          purchaseOrderDetails={formData?.purchase_order}
          isViewMode={isView}
          invoiceType={formData?.invoice_type || selectedInvoice?.invoice_type}
        />
      ),
    },
    {
      name: 'total_amount',
      label: 'Total Amount',
      type: 'custom',
      required: true,
      validate: validateTotalAmount,
      render: (value, onChange, isView, formData) => (
        <TotalAmountComponent 
          value={value} 
          onChange={onChange} 
          isViewMode={isView}
          purchaseOrderDetails={formData?.purchase_order}
          invoiceType={formData?.invoice_type}
        />
      ),
    },
    {
      name: 'invoice_type',
      label: 'Invoice Type',
      type: 'select',
      required: true,
      validate: validateInvoiceType,
      tooltip: 'Type of invoice',
      options: [
        { value: 'material', label: 'Material' },
        { value: 'service', label: 'Service' }
      ]
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      readOnly: isViewMode,
      validate: validateStatus,
      tooltip: 'Invoice status',
      options: [
        { value: 'unpaid', label: 'Unpaid' },
        { value: 'paid', label: 'Paid' }
      ]
    },
    {
      name: 'description',
      label: 'Description',
      type: 'custom',
      required: false,
      render: (value, onChange, isView, formData) => (
        <DescriptionComponent 
          value={value} 
          onChange={onChange} 
          isViewMode={isView}
          purchaseOrderDetails={formData?.purchase_order}
        />
      ),
    },
    {
      name: 'with_hold_tax',
      label: 'With Gst',
      type: 'checkbox',
      required: false,
      defaultValue: true,
      tooltip: 'Check if GST should be applied to this invoice'
    },
    // Payment fields - always include but will be conditionally rendered
    {
      name: 'voucher_no',
      label: 'Voucher Number',
      type: 'text',
      required: false,
      validate: validateVoucherNo,
      tooltip: 'Voucher number (optional)',
      conditional: {
        field: 'status',
        value: 'paid'
      }
    },
    {
      name: 'bank',
      label: 'Bank',
      type: 'text',
      required: false,
      validate: validateBank,
      tooltip: 'Bank name (optional)',
      conditional: {
        field: 'status',
        value: 'paid'
      }
    },
    {
      name: 'deposit_date',
      label: 'Deposit Date',
      type: 'custom',
      required: false,
      render: (value, onChange, isView) => (
        <DepositDateComponent 
          value={value} 
          onChange={onChange} 
          isViewMode={isView}
        />
      ),
      conditional: {
        field: 'status',
        value: 'paid'
      }
    },
    {
      name: 'dw_bank',
      label: 'DW Bank',
      type: 'text',
      required: false,
      validate: validateDwBank,
      tooltip: 'DW Bank information (optional)',
      conditional: {
        field: 'status',
        value: 'paid'
      }
    }
    ];
  }, [modalMode, customers, selectedPurchaseOrder, currentModalCustomer]);

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

  // API call to fetch invoices with pagination
  const loadInvoices = React.useCallback(async (dateRange = appliedDateRange) => {
    if (!canRead) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      
      let apiUrl = `/api/invoices?page=${page}&size=${pageSize}`;
      
      // Add date range parameters
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      if (params.toString()) {
        apiUrl += `&${params.toString()}`;
      }
      
      console.log('🔄 Loading invoices with date range:', dateRange);
      const invoiceData = await get(apiUrl);
      
      if (invoiceData.content && Array.isArray(invoiceData.content)) {
        setRowsState({
          rows: invoiceData.content,
          rowCount: invoiceData.totalElements || invoiceData.content.length,
        });
      } else if (Array.isArray(invoiceData)) {
        setRowsState({
          rows: invoiceData,
          rowCount: invoiceData.length,
        });
      } else {
        setRowsState({
          rows: [],
          rowCount: 0,
        });
      }
      
    } catch (loadError) {
      setError(loadError.message || 'Failed to load invoices');
      toast.error('Failed to load invoices', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.error('Error loading invoices:', loadError);
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead, appliedDateRange]);

  // Load data effect - only for pagination changes when not searching
  React.useEffect(() => {
    const hasSearchCriteria = searchState.invoiceNo || searchState.customerName || searchState.status;
    
    if (!hasSearchCriteria) {
      setSearchState(prev => ({ ...prev, isActive: false }));
      loadInvoices();
    }
  }, [paginationModel]);

  // Sync temp date range with applied date range
  React.useEffect(() => {
    setTempDateRange({
      startDate: appliedDateRange.startDate,
      endDate: appliedDateRange.endDate,
    });
  }, [appliedDateRange]);

  // Auto-trigger search if URL has status parameter
  React.useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && searchState.status === urlStatus) {
      // Trigger search with current search state and applied date range
      const searchParams = {
        invoiceNo: searchState.invoiceNo,
        customerName: searchState.customerName,
        status: searchState.status
      };
      performSearch(searchParams, appliedDateRange);
    }
  }, [searchParams, searchState, performSearch, appliedDateRange]);

  // Reload data when date range changes
  React.useEffect(() => {
    console.log('🔄 Date range changed, reloading data:', appliedDateRange);
    const hasSearchCriteria = searchState.invoiceNo || searchState.customerName || searchState.status;
    
    if (!hasSearchCriteria) {
      setSearchState(prev => ({ ...prev, isActive: false }));
      loadInvoices(appliedDateRange);
    }
  }, [appliedDateRange, loadInvoices, searchState.invoiceNo, searchState.customerName, searchState.status]);

  // Action handlers
  const handleView = React.useCallback(async (invoiceData) => {
    if (!canRead) return;
    
    try {
      // Fetch full invoice details to ensure we have all fields
      const fullInvoiceData = await get(`/api/invoices/${invoiceData.id}`);
      console.log('🔄 Full invoice data for view:', fullInvoiceData);
      
      setSelectedInvoice(fullInvoiceData);
      setCurrentFormData(null);
      setModalMode('view');
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to load invoice details', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  }, [canRead, get]);

  const handleEdit = React.useCallback(async (invoiceData) => {
    if (!canUpdate) return;
    
    console.log('🔄 Editing invoice:', invoiceData);
    console.log('🔄 Invoice customer data:', invoiceData.customer);
    console.log('🔄 Invoice purchase order data:', invoiceData.purchaseOrder);
    
    try {
      // Fetch full invoice details to ensure we have all fields
      const fullInvoiceData = await get(`/api/invoices/${invoiceData.id}`);
      console.log('🔄 Full invoice data:', fullInvoiceData);
      
      // Set the selected invoice with full data
      setSelectedInvoice(fullInvoiceData);
      
      // Set the current modal customer for purchase order loading
      if (fullInvoiceData.customer) {
        setCurrentModalCustomer(fullInvoiceData.customer);
      }
      
      setModalMode('edit');
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to load invoice details', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  }, [canUpdate, get]);

  const handleDelete = React.useCallback((invoiceData) => {
    if (!canDelete) return;
    setInvoiceToDelete(invoiceData);
    setDeleteDialogOpen(true);
  }, [canDelete]);

  // Confirm delete function
  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    
    setIsLoading(true);
    setDeleteDialogOpen(false);
    
    try {
      await del(`/api/invoices/${invoiceToDelete.id}`);

      toast.success(`Invoice #${invoiceToDelete.id} deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      loadInvoices();
    } catch (deleteError) {
      toast.error(`Failed to delete invoice: ${deleteError.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
      setInvoiceToDelete(null);
    }
  };

  // Cancel delete function
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setInvoiceToDelete(null);
  };

  // const handleCreate = React.useCallback(() => {
  //   if (!canCreate) return;
  //   setSelectedInvoice({ 
  //     customer: null,
  //     purchase_order: null,
  //     total_amount: '',
  //     invoice_type: 'material',
  //     status: 'unpaid',
  //     description: '',
  //     with_hold_tax: true
  //   });
  //   setCurrentFormData({});
  //   setModalMode('create');
  //   setModalOpen(true);
  // }, [canCreate]);

  // Search handlers for separate fields - non-blocking input
  
  const handleCreate = React.useCallback(() => {
    if (!canCreate) return;
    setSelectedInvoice(null); // Don't set default values that could interfere
    setCurrentFormData(null); // Set to null instead of empty object
    setCurrentModalCustomer(null); // Reset customer state
    setPurchaseOrders([]); // Clear purchase orders
    setSelectedPurchaseOrder(null); // Clear selected purchase order
    setModalMode('create');
    setModalOpen(true);
  }, [canCreate]);
  const handleInvoiceNoChange = React.useCallback((event) => {
    const value = event.target.value;
    setSearchState(prev => ({ ...prev, invoiceNo: value }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  const handleCustomerNameChange = React.useCallback((event, newValue) => {
    console.log('🔄 Customer change triggered:', { newValue, type: typeof newValue });
    
    if (newValue && typeof newValue === 'object') {
      // User selected from dropdown
      const customerName = newValue.customerName || '';
      console.log('🎯 Customer selected from dropdown:', customerName);
      
      setSearchState(prev => ({ ...prev, customerName: customerName }));
      setPaginationModel(prev => ({ ...prev, page: 0 }));
      
      // Trigger search immediately when customer is selected
      const searchParams = {
        invoiceNo: searchState.invoiceNo,
        customerName: customerName,
        status: searchState.status
      };
      performSearch(searchParams, appliedDateRange);
      
    } else if (typeof newValue === 'string') {
      // User cleared or typed something
      const customerName = newValue.trim();
      setSearchState(prev => ({ ...prev, customerName: customerName }));
      setPaginationModel(prev => ({ ...prev, page: 0 }));
    }
  }, [searchState.invoiceNo, searchState.status, performSearch]);

  const handleCustomerNameInputChange = React.useCallback((event, newInputValue) => {
    if (typeof newInputValue === 'string') {
      const trimmedValue = newInputValue.trim();
      console.log('⌨️ Customer input change:', trimmedValue);
      
      // Update the input value in state
      setSearchState(prev => ({
        ...prev,
        customerName: trimmedValue,
      }));
      
      // Trigger dropdown search if enough characters
      if (trimmedValue.length >= 2) {
        debouncedCustomerSearch(trimmedValue);
      } else {
        setCustomerSuggestions(prev => ({
          ...prev,
          options: [],
          isLoading: false,
        }));
      }
    }
  }, [debouncedCustomerSearch]);

  const handleStatusChange = React.useCallback((event) => {
    const value = event.target.value;
    setSearchState(prev => ({ ...prev, status: value, isActive: true }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
    
    // Status change triggers immediate search (no debounce needed for dropdown)
    const searchParams = {
      invoiceNo: searchState.invoiceNo,
      customerName: searchState.customerName,
      status: value
    };
    performSearch(searchParams, appliedDateRange);
  }, [searchState.invoiceNo, searchState.customerName, performSearch, appliedDateRange]);

  // Key handlers for Enter key search
  const handleInvoiceNoKeyDown = React.useCallback((event) => {
    if (event.key === 'Enter') {
      setSearchState(prev => ({ ...prev, isActive: true }));
      const searchParams = {
        invoiceNo: searchState.invoiceNo,
        customerName: searchState.customerName,
        status: searchState.status
      };
      performSearch(searchParams, appliedDateRange);
    }
  }, [searchState.invoiceNo, searchState.customerName, searchState.status, performSearch, appliedDateRange]);

  const handleCustomerNameKeyDown = React.useCallback((event) => {
    if (event.key === 'Enter') {
      setSearchState(prev => ({ ...prev, isActive: true }));
      const searchParams = {
        invoiceNo: searchState.invoiceNo,
        customerName: searchState.customerName,
        status: searchState.status
      };
      performSearch(searchParams, appliedDateRange);
    }
  }, [searchState.invoiceNo, searchState.customerName, searchState.status, performSearch, appliedDateRange]);

  const handleClearAllSearch = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    setSearchState({
      invoiceNo: '',
      customerName: '',
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
        loadInvoices();
      }
    }
  }, [isLoading, canRead, searchState.isActive, searchState, performSearch, loadInvoices]);

  const handleDownloadInvoice = React.useCallback(async (invoiceData) => {
    if (!canRead) return;
    
    try {
      // Set loading state
      setDownloadingInvoiceId(invoiceData.id);
      
      // Show loading toast
      const loadingToastId = toast.loading('Preparing invoice PDF for download...', {
        position: "top-right",
        autoClose: false,
      });
      
      // Fetch full invoice data to get quotation title
      const fullInvoiceData = await get(`/api/invoices/${invoiceData.id}`);
      
      const response = await fetch(`${BASE_URL}/api/generate/invoice/${invoiceData.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      // Generate filename with quotation title + "_invoice_" + timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: YYYY-MM-DDTHH-MM-SS
      
      // Get quotation title from full invoice data
      const quotationTitle = fullInvoiceData?.purchaseOrder?.quotation?.title || 
                             fullInvoiceData?.quotation?.title || 
                             'invoice';
      
      // Sanitize title: remove invalid filename characters and replace spaces with underscores
      const sanitizedTitle = quotationTitle
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit length to 50 characters
      
      const filename = `${sanitizedTitle}_invoice_${timestamp}.pdf`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success('Invoice downloaded successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      // Clear loading state
      setDownloadingInvoiceId(null);
    }
  }, [canRead, token, get]);


  const handleViewPdf = React.useCallback(async (invoiceData) => {
    try {
      setLoadingPdfPreview(true);
      setViewingPdfInvoiceId(invoiceData.id);
      
      // Show loading toast
      const loadingToastId = toast.loading('Loading invoice PDF preview...', {
        position: "top-right",
        autoClose: false,
      });
      
      console.log('Loading PDF preview for invoice:', invoiceData);
      
      const response = await get(`/api/generate/invoice/${invoiceData.id}/html`);
      
      if (response.success && response.html) {
        setPdfPreviewData({
          invoice: invoiceData,
          html: response.html
        });
        setPdfPreviewOpen(true);
        
        // Dismiss loading toast
        toast.dismiss(loadingToastId);
      } else {
        throw new Error('Failed to load PDF preview');
      }
      
    } catch (error) {
      console.error('PDF preview error:', error);
      toast.error('Failed to load PDF preview', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoadingPdfPreview(false);
      setViewingPdfInvoiceId(null);
    }
  }, [get]);

  // Export All handlers
  const handleExportAllClick = React.useCallback(() => {
    console.log('Export Paid Invoices button clicked');
    setExportAllDialogOpen(true);
  }, []);

  const handleExportDateChange = React.useCallback((field, value) => {
    setExportDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleExportAllSubmit = React.useCallback(async () => {
    if (!exportDateRange.startDate || !exportDateRange.endDate) {
      toast.error('Please select both start and end dates', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setExportAllLoading(true);
    try {
      console.log('Exporting paid invoices with date range:', exportDateRange);
      
      // Call the CSV export API
      const response = await fetch(`${BASE_URL}/api/export/paid-invoices-csv?startDate=${exportDateRange.startDate}&endDate=${exportDateRange.endDate}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export invoices');
      }

      // Get the CSV content
      const csvContent = await response.text();
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `paid_invoices_${exportDateRange.startDate}_to_${exportDateRange.endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Paid invoices exported successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      setExportAllDialogOpen(false);
    } catch (error) {
      console.error('Export All error:', error);
      toast.error(`Failed to export invoices: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setExportAllLoading(false);
    }
  }, [exportDateRange, token]);

  const handleExportAllCancel = React.useCallback(() => {
    setExportAllDialogOpen(false);
    setExportDateRange({
      startDate: '',
      endDate: ''
    });
  }, []);

  const handleRowClick = React.useCallback(
    ({ row }) => {
      handleView(row);
    },
    [handleView],
  );

  // Handle modal submit
  const handleModalSubmit = async (formData) => {
    console.log('Modal submit called with:', formData);
    console.log('Modal mode:', modalMode);
    
    if (modalMode === 'view') {
      setModalOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        customer_id: formData.customer.id,
        quotation_id: formData.quotation ? formData.quotation.id : null,
        purchase_order_id: formData.purchase_order ? formData.purchase_order.id : null,
        total_amount: parseFloat(formData.total_amount),
        tax_deducted: 0, // Always set to 0
        invoice_type: formData.invoice_type,
        status: formData.status,
        description: formData.description || '',
        with_hold_tax: formData.with_hold_tax || false,
        voucher_no: formData.voucher_no || null,
        bank: formData.bank || null,
        deposit_date: formData.deposit_date || null,
        dw_bank: formData.dw_bank || null,
        created_by: user.id,
        updated_by: user.id
      };

      let response;
      
      if (modalMode === 'create') {
        response = await post('/api/invoices', submitData);
      } else {
        response = await put(`/api/invoices/${selectedInvoice.id}`, submitData);
      }

      const successMessage = modalMode === 'create' 
        ? 'Invoice created successfully!' 
        : 'Invoice updated successfully!';
      
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setModalOpen(false);
      loadInvoices();
    } catch (submitError) {
      let errorMessage = `Failed to ${modalMode} invoice`;
      
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

  // Column definitions for invoices
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
        field: 'customer',
        headerName: 'Purchaser',
        width: 200,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => {
          if (params.value && typeof params.value === 'object') {
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
                {params.value.customerName}
                {params.value.companyName && ` (${params.value.companyName})`}
              </Typography>
            );
          }
          return (
            <Typography 
              variant="body2" 
              color="textSecondary" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: '100%',
                lineHeight: 1.5,
                fontStyle: 'italic' 
              }}
            >
              {params.value || 'No customer'}
            </Typography>
          );
        },
      },
      {
        field: 'purchaseOrder',
        headerName: 'Purchase Order',
        width: 180,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => {
          if (params.value && params.value.purchase_order_no) {
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
                {params.value.purchase_order_no}
              </Typography>
            );
          }
          return (
            <Typography 
              variant="body2" 
              color="textSecondary" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: '100%',
                lineHeight: 1.5,
                fontStyle: 'italic' 
              }}
            >
              No PO
            </Typography>
          );
        },
      },
      {
        field: 'total_amount',
        headerName: 'Total Amount',
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
              lineHeight: 1.5,
              fontWeight: 'bold' 
            }}
          >
            PKR {params.value ? parseFloat(params.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </Typography>
        ),
      },
      {
        field: 'totalWithGST',
        headerName: 'Gst Total',
        width: 160,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => {
          const totalWithGST = params.value || params.row.totalWithGST || 0;
          const formattedPrice = typeof totalWithGST === 'number' 
            ? totalWithGST.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : (totalWithGST ? Number(totalWithGST).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00');
          return (
            <Typography 
              variant="body2" 
              fontWeight="bold" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: '100%',
                lineHeight: 1.5,
                color: '#7b1fa2' // Purple color for GST amount
              }}
            >
              PKR {formattedPrice}
            </Typography>
          );
        },
      },
      {
        field: 'invoice_type',
        headerName: 'Type',
        width: 100,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => {
          const getTypeColor = (type) => {
            switch (type) {
              case 'material': return 'primary';
              case 'service': return 'secondary';
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
                color={getTypeColor(params.value)}
              />
            </Box>
          );
        },
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
              case 'unpaid': return 'warning';
              case 'paid': return 'success';
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
        field: 'with_hold_tax',
        headerName: 'With Gst',
        width: 120,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => (
          <Box
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '100%',
              lineHeight: 1.5
            }}
          >
            <Chip 
              label={params.value ? 'Yes' : 'No'} 
              variant="outlined" 
              size="small"
              color={params.value ? 'warning' : 'default'}
            />
          </Box>
        ),
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

  const pageTitle = 'Invoice Management';

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

      {/* Filters - Compact Design */}
      {canRead && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Filters
          </Typography>
          
          {/* First Row: Date Range */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Start Date"
                type="date"
                value={tempDateRange.startDate}
                onChange={(e) => handleTempDateChange('startDate', e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: tempDateRange.endDate }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="End Date"
                type="date"
                value={tempDateRange.endDate}
                onChange={(e) => handleTempDateChange('endDate', e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: tempDateRange.startDate }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                size="small"
                onClick={handleApplyDateRange}
                disabled={
                  !tempDateRange.startDate || !tempDateRange.endDate || isLoading
                }
                fullWidth
                sx={{ height: '40px' }}
              >
                Apply
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Range: {appliedDateRange.startDate} to {appliedDateRange.endDate}
              </Typography>
            </Grid>
          </Grid>
          
          {/* Second Row: Search Fields */}
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Invoice Number Search */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Invoice Number"
                placeholder="Enter invoice number..."
                value={searchState.invoiceNo}
                onChange={handleInvoiceNoChange}
                onKeyDown={handleInvoiceNoKeyDown}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Customer Name Search */}
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                freeSolo
                options={customerSuggestions.options}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.customerName || '';
                }}
                value={searchState.customerName}
                onChange={handleCustomerNameChange}
                onInputChange={handleCustomerNameInputChange}
                inputValue={searchState.customerName}
                loading={customerSuggestions.isLoading}
                loadingText="Searching customers..."
                noOptionsText={searchState.customerName.length < 2 ? "Type at least 2 characters to search" : "No customers found"}
                filterOptions={(options) => options}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Purchaser Name"
                    placeholder="Type purchaser name..."
                    size="small"
                    onKeyDown={handleCustomerNameKeyDown}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search color="action" />
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
            </Grid>

            {/* Status Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={searchState.status}
                  onChange={handleStatusChange}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Clear All Button */}
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearAllSearch}
                startIcon={<Clear />}
                size="small"
                sx={{ height: '40px' }}
              >
                Clear All
              </Button>
            </Grid>
          </Grid>

          {/* Active Search Indicator */}
          {searchState.isActive && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`Active Search: ${[
                  searchState.invoiceNo && `Invoice: ${searchState.invoiceNo}`,
                  searchState.customerName && `Customer: ${searchState.customerName}`,
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

      {/* Export All Invoices Button */}
      {canRead && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={handleExportAllClick}
            sx={{
              backgroundColor: '#2e7d32',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#1b5e20',
              },
              px: 3,
              py: 1,
              fontWeight: 'bold',
              textTransform: 'none',
              fontSize: '0.9rem'
            }}
          >
            Export Paid Invoices
          </Button>
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
        onDownload={canRead ? handleDownloadInvoice : null}
        downloadingInvoiceId={downloadingInvoiceId}
        onViewPdf={canRead ? handleViewPdf : null}
        loadingPdfPreview={loadingPdfPreview}
        viewingPdfInvoiceId={viewingPdfInvoiceId}
        
        // Row interaction
        onRowClick={canRead ? handleRowClick : null}
        
        // Configuration
        pageSizeOptions={[5, 10, 25, 50]}
        showToolbar={true}
      />

      {/* Dynamic Modal for Invoice CRUD */}
      {/* <DynamicModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        title={`${modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Edit' : 'View'} Invoice`}
        initialData={selectedInvoice || {}}
        fields={invoiceFields}
        onSubmit={handleModalSubmit}
        loading={isLoading}
        onFormDataChange={handleFormDataChange}
      /> */}

      {/* Static Invoice Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCurrentModalCustomer(null);
          setPurchaseOrders([]);
          setSelectedPurchaseOrder(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            minHeight: '80vh',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: '#333',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e0e0e0',
            pb: 2
          }}
        >
          <Typography variant="h6">
            {modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Edit' : 'View'} Invoice
          </Typography>
          <Button
            onClick={() => setModalOpen(false)}
            variant="outlined"
            size="small"
            sx={{ 
              color: '#666',
              borderColor: '#ddd',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: '#f5f5f5',
              }
            }}
          >
            Close
          </Button>
        </DialogTitle>
        
        <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <StaticInvoiceForm />
        </DialogContent>
        
        {modalMode !== 'view' && (
          <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #e0e0e0' }}>
            <Button 
              onClick={() => setModalOpen(false)}
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
              onClick={() => {
                if (validateForm()) {
                  handleModalSubmit(formData);
                }
              }}
              variant="contained"
              sx={{
                backgroundColor: '#1976d2',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
                '&:disabled': {
                  backgroundColor: '#e0e0e0',
                  color: '#ffffff',
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : modalMode === 'create' ? 'Create Invoice' : 'Update Invoice'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
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
            Are you sure you want to delete invoice <strong>#{invoiceToDelete?.id}</strong>?
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

      {/* PDF Preview Modal */}
      <Dialog
        open={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            minHeight: '90vh',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: '#333',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e0e0e0',
            pb: 2
          }}
        >
          <Typography variant="h6">
            PDF Preview - Invoice #{pdfPreviewData?.invoice?.id}
          </Typography>
          <Button
            onClick={() => setPdfPreviewOpen(false)}
            variant="outlined"
            size="small"
            sx={{ 
              color: '#666',
              borderColor: '#ddd',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: '#f5f5f5',
              }
            }}
          >
            Close
          </Button>
        </DialogTitle>
        <DialogContent 
          sx={{ 
            flex: 1, 
            p: 0, 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {loadingPdfPreview ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flex: 1
            }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading PDF preview...</Typography>
            </Box>
          ) : pdfPreviewData?.html ? (
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              '& iframe': {
                width: '100%',
                height: '100%',
                border: 'none'
              }
            }}>
              <iframe
                srcDoc={pdfPreviewData.html}
                title={`Invoice ${pdfPreviewData.invoice?.id} Preview`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  minHeight: '70vh'
                }}
              />
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flex: 1
            }}>
              <Typography color="textSecondary">
                No preview data available
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Export All Dialog */}
      <Dialog
        open={exportAllDialogOpen}
        onClose={handleExportAllCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            minWidth: '400px',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            color: '#333',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e0e0e0',
            pb: 2
          }}
        >
          <Typography variant="h6">
            Export Paid Invoices
          </Typography>
          <Button
            onClick={handleExportAllCancel}
            variant="outlined"
            size="small"
            sx={{ 
              color: '#666',
              borderColor: '#ddd',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: '#f5f5f5',
              }
            }}
          >
            Close
          </Button>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 3, color: '#666' }}>
            Select the date range for paid invoices you want to export:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={exportDateRange.startDate}
              onChange={(e) => handleExportDateChange('startDate', e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: exportDateRange.endDate }}
            />
            
            <TextField
              label="End Date"
              type="date"
              value={exportDateRange.endDate}
              onChange={(e) => handleExportDateChange('endDate', e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: exportDateRange.startDate }}
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={handleExportAllCancel}
            variant="outlined"
            sx={{ 
              color: '#666',
              borderColor: '#ddd',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: '#f5f5f5',
              }
            }}
            disabled={exportAllLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExportAllSubmit}
            variant="contained"
            sx={{
              backgroundColor: '#2e7d32',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#1b5e20',
              },
              '&:disabled': {
                backgroundColor: '#e0e0e0',
                color: '#ffffff',
              }
            }}
            disabled={exportAllLoading || !exportDateRange.startDate || !exportDateRange.endDate}
          >
            {exportAllLoading ? 'Exporting...' : 'Export Paid Invoices'}
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
