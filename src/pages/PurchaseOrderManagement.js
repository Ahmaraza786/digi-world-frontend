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
  InputAdornment as MUIInputAdornment,
} from '@mui/material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../auth/AuthContext';
import { DataGrid } from '@mui/x-data-grid';
import ReusableDataTable from '../components/ReusableData';
import PageContainer from '../components/PageContainer';
import DynamicModal from '../components/DynamicModel';
import { BASE_URL } from "../constants/Constants";
import { useApi } from '../hooks/useApi';
import { Add, Delete, Edit, Search, Clear, Visibility, AttachFile, CloudUpload, LocalShipping, History, Download } from '@mui/icons-material';

const INITIAL_PAGE_SIZE = 10;

// Challan Generation Form Component
const ChallanGenerationForm = ({ availableMaterials, purchaseOrder, onClose, onSuccess }) => {
  const [selectedMaterials, setSelectedMaterials] = React.useState([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { post } = useApi();

  const handleMaterialToggle = (material) => {
    setSelectedMaterials(prev => {
      const exists = prev.find(m => m.material_id === material.material_id);
      if (exists) {
        return prev.filter(m => m.material_id !== material.material_id);
      } else {
        return [...prev, { ...material, quantity: 1 }];
      }
    });
  };

  const handleQuantityChange = (materialId, quantity) => {
    setSelectedMaterials(prev => 
      prev.map(m => 
        m.material_id === materialId 
          ? { ...m, quantity: Math.max(1, parseInt(quantity) || 1) }
          : m
      )
    );
  };

  const handleSubmit = async () => {
    if (selectedMaterials.length === 0) {
      toast.error('Please select at least one material', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!purchaseOrder || !purchaseOrder.id) {
      console.error('Purchase order data:', purchaseOrder);
      toast.error('Purchase order information is missing', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    console.log('Creating challan with data:', {
      purchase_order_id: purchaseOrder.id,
      materials: selectedMaterials,
      purchaseOrder: purchaseOrder
    });

    setIsSubmitting(true);
    try {
      const response = await post('/api/challans', {
        purchase_order_id: purchaseOrder.id,
        materials: selectedMaterials
      });

      if (response.success) {
        onSuccess();
      } else {
        throw new Error(response.message || 'Failed to create challan');
      }
    } catch (error) {
      console.error('Error creating challan:', error);
      toast.error(error.message || 'Failed to create challan', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Select Materials for Delivery
      </Typography>
      
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Purchase Order: {purchaseOrder?.purchase_order_no}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {availableMaterials.map((material) => (
          <Grid item xs={12} md={6} key={material.material_id}>
            <Card 
              sx={{ 
                p: 2, 
                border: selectedMaterials.find(m => m.material_id === material.material_id) 
                  ? '2px solid #1976d2' 
                  : '1px solid #e0e0e0',
                cursor: material.can_deliver ? 'pointer' : 'not-allowed',
                opacity: material.can_deliver ? 1 : 0.6
              }}
              onClick={() => material.can_deliver && handleMaterialToggle(material)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {material.material_name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Unit: {material.unit}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Original:</strong> {material.original_quantity} | 
                    <strong> Delivered:</strong> {material.delivered_quantity} | 
                    <strong> Remaining:</strong> {material.remaining_quantity}
                  </Typography>
                  {material.can_deliver && selectedMaterials.find(m => m.material_id === material.material_id) && (
                    <TextField
                      type="number"
                      label="Quantity to Deliver"
                      value={selectedMaterials.find(m => m.material_id === material.material_id)?.quantity || 1}
                      onChange={(e) => handleQuantityChange(material.material_id, e.target.value)}
                      size="small"
                      inputProps={{ 
                        min: 1, 
                        max: material.remaining_quantity 
                      }}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
                <Box sx={{ ml: 2 }}>
                  {selectedMaterials.find(m => m.material_id === material.material_id) ? (
                    <Chip label="Selected" color="primary" size="small" />
                  ) : (
                    <Chip 
                      label={material.can_deliver ? "Available" : "Fully Delivered"} 
                      color={material.can_deliver ? "default" : "secondary"} 
                      size="small" 
                    />
                  )}
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={selectedMaterials.length === 0 || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <LocalShipping />}
        >
          {isSubmitting ? 'Generating...' : 'Generate Challan'}
        </Button>
      </Box>
    </Box>
  );
};

// Challan History Table Component
const ChallanHistoryTable = ({ challanHistory, purchaseOrder, onDownloadPDF, onPreviewPDF, downloadingPdf, loadingPdfPreview }) => {

  const handleDownloadPDF = async (challanId, challanNo) => {
    await onDownloadPDF(challanId, challanNo);
  };

  const handlePreviewPDF = async (challanId) => {
    await onPreviewPDF(challanId);
  };

  const columns = [
    {
      field: 'challan_no',
      headerName: 'Challan No.',
      width: 150,
    },
    {
      field: 'challan_date',
      headerName: 'Date',
      width: 120,
      valueFormatter: (params) => {
        if (!params.value) return '';
        try {
          const date = new Date(params.value);
          return date.toLocaleDateString();
        } catch (error) {
          return params.value;
        }
      },
    },
    {
      field: 'materials',
      headerName: 'Materials',
      width: 300,
      renderCell: (params) => (
        <Box>
          {params.value.map((material, index) => (
            <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
              {material.material_name} - Qty: {material.quantity} {material.unit}
            </Typography>
          ))}
        </Box>
      ),
    },
    {
      field: 'total_quantity',
      headerName: 'Total Qty',
      width: 100,
    },
    // {
    //   field: 'created_at',
    //   headerName: 'Created',
    //   width: 150,
    //   valueFormatter: (params) => {
    //     if (!params.value) return '';
    //     try {
    //       const date = new Date(params.value);
    //       return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    //     } catch (error) {
    //       return params.value;
    //     }
    //   },
    // },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 320,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Preview PDF">
            <IconButton
              size="small"
              onClick={() => handlePreviewPDF(params.row.id)}
              color="info"
              disabled={loadingPdfPreview}
            >
              {loadingPdfPreview ? <CircularProgress size={16} /> : <Visibility />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Download PDF">
            <IconButton
              size="small"
              onClick={() => handleDownloadPDF(params.row.id, params.row.challan_no)}
              color="primary"
              disabled={downloadingPdf[params.row.id]}
            >
              {downloadingPdf[params.row.id] ? <CircularProgress size={16} /> : <Download />}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Delivery History for {purchaseOrder?.purchase_order_no}
      </Typography>
      
      {challanHistory.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
          No challans generated yet for this purchase order.
        </Typography>
      ) : (
        <Box sx={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={challanHistory}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5, 10, 25]}
            disableSelectionOnClick
            disableColumnMenu
            hideFooterSelectedRowCount
          />
        </Box>
      )}
    </Box>
  );
};

export default function PurchaseOrderManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, hasPermission, token } = useAuth();
  
  // Check user permissions
  const canRead = user?.permissions?.purchase_order?.includes('read') || false;
  const canCreate = user?.permissions?.purchase_order?.includes('create') || false;
  const canUpdate = user?.permissions?.purchase_order?.includes('update') || false;
  const canDelete = user?.permissions?.purchase_order?.includes('delete') || false;

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
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = React.useState(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [purchaseOrderToDelete, setPurchaseOrderToDelete] = React.useState(null);

  // Challan generation state
  const [challanModalOpen, setChallanModalOpen] = React.useState(false);
  const [challanHistoryModalOpen, setChallanHistoryModalOpen] = React.useState(false);
  const [selectedPurchaseOrderForChallan, setSelectedPurchaseOrderForChallan] = React.useState(null);
  const [availableMaterials, setAvailableMaterials] = React.useState([]);
  const [challanHistory, setChallanHistory] = React.useState([]);
  const [loadingMaterials, setLoadingMaterials] = React.useState(false);
  const [loadingChallanHistory, setLoadingChallanHistory] = React.useState(false);

  // PDF preview modal state
  const [pdfPreviewOpen, setPdfPreviewOpen] = React.useState(false);
  const [pdfPreviewData, setPdfPreviewData] = React.useState(null);
  const [loadingPdfPreview, setLoadingPdfPreview] = React.useState(false);
  const [downloadingPdf, setDownloadingPdf] = React.useState({});

  // Data for dropdowns
  const [customers, setCustomers] = React.useState([]);
  const [quotations, setQuotations] = React.useState([]);
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);
  const [loadingQuotations, setLoadingQuotations] = React.useState(false);
  
  // Current customer in modal state
  const [currentModalCustomer, setCurrentModalCustomer] = React.useState(null);

  // Search state - separate fields, check URL params first
  const [searchState, setSearchState] = React.useState(() => {
    const urlStatus = searchParams.get('status');
    return {
      purchaseOrderNo: '',
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
  
  // Material costs ref for tracking costs across form submissions
  const materialCostsRef = React.useRef({});

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
      let apiUrl = `/api/purchase-orders?page=${page}&size=${pageSize}`;
      
      // Add search parameters
      const params = new URLSearchParams();
      
      // Add date range parameters
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      // For purchase order number, use the search parameter which searches purchase_order_no field
      if (searchParams.purchaseOrderNo?.trim()) {
        params.append('search', searchParams.purchaseOrderNo.trim());
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
      console.error('💥 Error searching purchase orders:', loadError);
      setError(loadError.message || 'Failed to search purchase orders');
      toast.error('Failed to search purchase orders', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead]);

  // Load customers for dropdown
  const loadCustomers = React.useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const customerData = await get('/api/customers/all');
      
      if (Array.isArray(customerData)) {
        setCustomers(customerData);
      } else if (customerData.data && Array.isArray(customerData.data)) {
        setCustomers(customerData.data);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoadingCustomers(false);
    }
  }, [get]);

  // Load quotations by customer ID
  const loadQuotationsByCustomer = React.useCallback(async (customerId) => {
    if (!customerId) {
      setQuotations([]);
      return;
    }

    setLoadingQuotations(true);
    try {
      const response = await get(`/api/quotations/customer/${customerId}`);
      
      if (response.success && response.quotations) {
        setQuotations(response.quotations);
      } else {
        setQuotations([]);
      }
    } catch (error) {
      console.error('Error loading quotations:', error);
      toast.error('Failed to load quotations', {
        position: "top-right",
        autoClose: 3000,
      });
      setQuotations([]);
    } finally {
      setLoadingQuotations(false);
    }
  }, [get]);

  // Load individual quotation with materials
  const loadQuotationWithMaterials = React.useCallback(async (quotationId) => {
    if (!quotationId) return null;
    
    try {
      const response = await get(`/api/quotations/${quotationId}`);
      
      // Check different possible response structures
      let quotationData = null;
      if (response.success && response.quotation) {
        quotationData = response.quotation;
      } else if (response.quotation) {
        quotationData = response.quotation;
      } else if (response.data && response.data.quotation) {
        quotationData = response.data.quotation;
      } else if (response.data) {
        quotationData = response.data;
      }
      
      if (quotationData) {
        return quotationData;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading quotation with materials:', error);
      return null;
    }
  }, [get]);

  // Load customers when modal opens
  React.useEffect(() => {
    if (modalOpen && (modalMode === 'create' || modalMode === 'edit')) {
      if (user && token) {
        loadCustomers();
      }
    }
  }, [modalOpen, modalMode, loadCustomers, user, token]);

  // Load quotations when editing a purchase order with a customer
  React.useEffect(() => {
    if (modalOpen && modalMode === 'edit' && selectedPurchaseOrder && selectedPurchaseOrder.customer) {
      setCurrentModalCustomer(selectedPurchaseOrder.customer);
      loadQuotationsByCustomer(selectedPurchaseOrder.customer.id);
    } else if (modalOpen && modalMode === 'create') {
      // Clear quotations when creating new purchase order
      setCurrentModalCustomer(null);
      setQuotations([]);
    }
  }, [modalOpen, modalMode, selectedPurchaseOrder?.id, loadQuotationsByCustomer]);

  // Handle quotation materials loading for edit mode
  React.useEffect(() => {
    if (modalOpen && modalMode === 'edit' && selectedPurchaseOrder?.quotation?.id) {
      loadQuotationWithMaterials(selectedPurchaseOrder.quotation.id).then(fullQuotation => {
        if (fullQuotation && fullQuotation.materials) {
          setSelectedPurchaseOrder(prev => ({
            ...prev,
            quotation: fullQuotation
          }));
        }
      }).catch(error => {
        console.error('Error loading quotation materials:', error);
      });
    }
  }, [modalOpen, modalMode, selectedPurchaseOrder?.quotation?.id, loadQuotationWithMaterials]);

  // Validation functions
  const validatePurchaseOrderNo = (purchaseOrderNo) => {
    if (!purchaseOrderNo || purchaseOrderNo.trim() === '') return 'Purchase order number is required';
    if (purchaseOrderNo.length > 100) return 'Purchase order number must be 100 characters or less';
    return '';
  };

  const validateCustomer = (customer) => {
    if (!customer) return 'Customer is required';
    return '';
  };

  const validateStatus = (status) => {
    if (!status) return 'Status is required';
    if (!['pending', 'delivered'].includes(status)) return 'Invalid status';
    return '';
  };

  // Custom Customer Selection Component
  const CustomerSelectionComponent = ({ value, onChange, isViewMode }) => {
    const [customerSearch, setCustomerSearch] = React.useState('');
    const [selectedCustomer, setSelectedCustomer] = React.useState(null);

    React.useEffect(() => {
      // Handle both string (customer name) and object (customer object) values
      if (value && value !== 'undefined' && value !== 'null') {
        if (typeof value === 'string') {
          // If value is a string (customer name), find the matching customer object
          const matchingCustomer = customers.find(customer => 
            customer.customerName === value || 
            `${customer.customerName}${customer.companyName ? ` (${customer.companyName})` : ''}` === value
          );
          setSelectedCustomer(matchingCustomer || null);
        } else if (typeof value === 'object' && value !== null) {
          // If value is already an object, use it directly
          setSelectedCustomer(value);
        } else {
          setSelectedCustomer(null);
        }
      } else {
        setSelectedCustomer(null);
      }
    }, [value, customers]);

    const handleCustomerSelect = (customer) => {
      if (isViewMode) return;
      setSelectedCustomer(customer);
      setCurrentModalCustomer(customer); // Update modal customer state
      onChange(customer);
      
      // Load quotations when customer is selected
      if (customer && customer.id) {
        loadQuotationsByCustomer(customer.id);
      } else {
        setQuotations([]);
      }
    };

    const filteredCustomers = customers.filter(customer => {
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
                label="Select customer"
                placeholder="Type to search..."
                size="small"
                fullWidth
              />
            )}
            loading={loadingCustomers}
            noOptionsText="No customers found"
          />
        ) : (
          <TextField
            label="Customer"
            value={
              selectedCustomer 
                ? `${selectedCustomer.customerName}${selectedCustomer.companyName ? ` (${selectedCustomer.companyName})` : ''}`
                : (typeof value === 'string' && value !== 'undefined' && value !== 'null' ? value : 'No customer selected')
            }
            disabled
            fullWidth
            size="small"
          />
        )}

        {(selectedCustomer || (typeof value === 'string' && value && value !== 'undefined' && value !== 'null')) && (
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

  // Custom Multi-File Upload Component
  const FileUploadComponent = ({ value, onChange, isViewMode, purchaseOrderId }) => {
    const [selectedFiles, setSelectedFiles] = React.useState([]);
    const [dragActive, setDragActive] = React.useState(false);
    const [loadingPresignedUrl, setLoadingPresignedUrl] = React.useState({});

    React.useEffect(() => {
      if (value && Array.isArray(value)) {
        setSelectedFiles(value);
      } else if (value && !Array.isArray(value)) {
        setSelectedFiles([value]);
      } else {
        setSelectedFiles([]);
      }
    }, [value]);

    const validateFile = (file) => {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type for ${file.name}. Only PDF and image files are allowed.`, {
          position: "top-right",
          autoClose: 3000,
        });
        return false;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`, {
          position: "top-right",
          autoClose: 3000,
        });
        return false;
      }

      return true;
    };

    const handleFileChange = (event) => {
      if (isViewMode) return;
      
      const files = Array.from(event.target.files);
      const validFiles = files.filter(validateFile);
      
      if (validFiles.length > 0) {
        const newFiles = [...selectedFiles, ...validFiles];
        setSelectedFiles(newFiles);
        onChange(newFiles);
      }
    };

    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      if (isViewMode) return;
      
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(validateFile);
      
      if (validFiles.length > 0) {
        const newFiles = [...selectedFiles, ...validFiles];
        setSelectedFiles(newFiles);
        onChange(newFiles);
      }
    };

    const removeFile = (index) => {
      if (isViewMode) return;
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newFiles);
      onChange(newFiles);
    };

    const clearAllFiles = () => {
      if (isViewMode) return;
      setSelectedFiles([]);
      onChange([]);
    };

    const handleViewFile = async (fileId) => {
      if (!purchaseOrderId || !fileId) return;
      
      setLoadingPresignedUrl(prev => ({ ...prev, [fileId]: true }));
      try {
        const response = await get(`/api/purchase-orders/${purchaseOrderId}/file-url/${fileId}`);
        
        if (response.success && response.presignedUrl) {
          // Open the presigned URL in a new tab
          window.open(response.presignedUrl, '_blank');
          
          // Show success message with expiration info
          toast.success(`File opened successfully! URL expires in ${Math.floor(response.expiresIn / 60)} minutes.`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } else {
          throw new Error('Failed to generate file URL');
        }
      } catch (error) {
        console.error('Error generating presigned URL:', error);
        toast.error('Failed to open file. Please try again.', {
          position: "top-right",
          autoClose: 3000,
        });
      } finally {
        setLoadingPresignedUrl(prev => ({ ...prev, [fileId]: false }));
      }
    };

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Purchase Order Files (Optional)
        </Typography>
        
        {!isViewMode ? (
          <Box>
            {/* Drag and Drop Area */}
            <Box
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              sx={{
                border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: dragActive ? '#e3f2fd' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: '#f0f0f0',
                  borderColor: '#1976d2'
                }
              }}
            >
              <CloudUpload sx={{ fontSize: 48, color: dragActive ? '#1976d2' : '#666', mb: 1 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                {dragActive ? 'Drop files here' : 'Drag & drop files here or click to browse'}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Supports PDF, JPG, PNG, GIF, WEBP (Max 10MB each)
              </Typography>
              
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<AttachFile />}
                  sx={{ mr: 1 }}
                >
                  Browse Files
                </Button>
              </label>
              
              {selectedFiles.length > 0 && (
                <Button
                  variant="text"
                  color="error"
                  onClick={clearAllFiles}
                  startIcon={<Clear />}
                  sx={{ ml: 1 }}
                >
                  Clear All
                </Button>
              )}
            </Box>
            
            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Selected Files ({selectedFiles.length})
                </Typography>
                {selectedFiles.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      mb: 1,
                      bgcolor: '#e3f2fd',
                      borderRadius: 1,
                      border: '1px solid #bbdefb'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <AttachFile sx={{ mr: 1, color: '#1976d2' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {file.name}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      onClick={() => removeFile(index)}
                      size="small"
                      color="error"
                    >
                      <Clear />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            {selectedFiles.length > 0 ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Attached Files ({selectedFiles.length})
                </Typography>
                {selectedFiles.map((file, index) => (
                  <Box
                    key={file.id || index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      mb: 1,
                      bgcolor: '#e8f5e8',
                      borderRadius: 1,
                      border: '1px solid #c8e6c9'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <AttachFile sx={{ mr: 1, color: '#4caf50' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {file.file_name || file.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {(() => {
                            const size = file.file_size || file.size;
                            if (size && size !== '0' && size !== 0) {
                              const sizeInMB = Number(size) / 1024 / 1024;
                              return `${sizeInMB.toFixed(2)} MB`;
                            }
                            return '';
                          })()} • {file.file_type || file.type}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={loadingPresignedUrl[file.id] ? <CircularProgress size={16} /> : <CloudUpload />}
                      onClick={() => handleViewFile(file.id)}
                      disabled={loadingPresignedUrl[file.id]}
                    >
                      {loadingPresignedUrl[file.id] ? 'Opening...' : 'View'}
                    </Button>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                No files uploaded
              </Typography>
            )}
          </Box>
        )}
      </Box>
    );
  };

  // Custom Quotation Selection Component
  const QuotationSelectionComponent = ({ value, onChange, isViewMode, selectedCustomer }) => {
    const [selectedQuotation, setSelectedQuotation] = React.useState(value || null);
    const [loadingQuotationDetails, setLoadingQuotationDetails] = React.useState(false);

    React.useEffect(() => {
      setSelectedQuotation(value || null);
    }, [value]);

    const handleQuotationSelect = async (quotation) => {
      if (isViewMode) return;
      
      // Check if quotation has materials, if not, fetch full details
      if (quotation && (!quotation.materials || quotation.materials.length === 0)) {
        setLoadingQuotationDetails(true);
        try {
          const fullQuotation = await loadQuotationWithMaterials(quotation.id);
          if (fullQuotation) {
            setSelectedQuotation(fullQuotation);
            onChange(fullQuotation);
          } else {
            setSelectedQuotation(quotation);
            onChange(quotation);
          }
        } catch (error) {
          console.error('Error loading quotation details:', error);
          setSelectedQuotation(quotation);
          onChange(quotation);
        } finally {
          setLoadingQuotationDetails(false);
        }
      } else {
        setSelectedQuotation(quotation);
        onChange(quotation);
      }
    };

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Quotation (Optional)
        </Typography>
        
        {!isViewMode ? (
          <Autocomplete
            options={quotations}
            getOptionLabel={(option) => option ? `${option.title} - PKR ${option.totalPrice}` : ''}
            value={selectedQuotation}
            onChange={(event, newValue) => handleQuotationSelect(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select quotation"
                placeholder={selectedCustomer ? "Select a quotation..." : "Select a customer first"}
                size="small"
                fullWidth
                disabled={!selectedCustomer || loadingQuotationDetails}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {(loadingQuotations || loadingQuotationDetails) && (
                        <CircularProgress color="inherit" size={20} sx={{ mr: 1 }} />
                      )}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            loading={loadingQuotations || loadingQuotationDetails}
            noOptionsText={!selectedCustomer ? "Please select a customer first" : quotations.length === 0 ? "No quotations found for this customer" : "No quotations available"}
            disabled={!selectedCustomer || loadingQuotationDetails}
          />
        ) : (
          <TextField
            label="Quotation"
            value={selectedQuotation ? `${selectedQuotation.title} - PKR ${selectedQuotation.totalPrice}` : 'None'}
            disabled
            fullWidth
            size="small"
          />
        )}

        {selectedQuotation && (
          <Box sx={{ mt: 1, p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Title:</strong> {selectedQuotation.title}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Total Price:</strong> PKR {selectedQuotation.totalPrice}
            </Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {selectedQuotation.status}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Custom Materials Breakdown Component
  const MaterialsBreakdownComponent = ({ quotation, isViewMode, onMaterialCostChange, purchaseOrderMaterialCosts }) => {
    const [materialCosts, setMaterialCosts] = React.useState({});

    // Initialize material costs
    React.useEffect(() => {
      if (quotation && quotation.materials) {
        const initialCosts = {};
        quotation.materials.forEach((material, index) => {
          // First check if we have saved material costs from the purchase order
          if (purchaseOrderMaterialCosts && purchaseOrderMaterialCosts[index] !== undefined) {
            initialCosts[index] = purchaseOrderMaterialCosts[index];
          } else if (material.actual_cost !== undefined) {
            initialCosts[index] = material.actual_cost;
          } else {
            initialCosts[index] = 0;
          }
        });
        setMaterialCosts(initialCosts);
      }
    }, [quotation, purchaseOrderMaterialCosts]);

    const handleCostChange = (index, value) => {
      const newCosts = { ...materialCosts, [index]: value };
      setMaterialCosts(newCosts);
      
      // Notify parent component about the change
      if (onMaterialCostChange) {
        onMaterialCostChange(newCosts);
      }
    };

    if (!quotation) {
      return null;
    }
    
    if (!quotation.materials || quotation.materials.length === 0) {
      return (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fff3cd', borderRadius: 1, border: '1px solid #ffeaa7' }}>
          <Typography variant="body2" color="warning.main">
            ⚠️ This quotation has no materials data. The materials breakdown cannot be displayed.
          </Typography>
        </Box>
      );
    }

    const totalActualCost = Object.values(materialCosts).reduce((sum, cost) => sum + parseFloat(cost || 0), 0);

    return (
      <Box sx={{ mb: 2, p: 2, bgcolor: '#f0f8ff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
          Materials Breakdown
        </Typography>
        
        {/* Materials Table */}
        <Box sx={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e0e0e0' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: 'bold' }}>
                  Material Name
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e0e0e0', fontWeight: 'bold' }}>
                  Quantity
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e0e0e0', fontWeight: 'bold' }}>
                  Unit
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: 'bold' }}>
                  Unit Price (Sold)
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: 'bold' }}>
                  Total Price (Sold)
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: 'bold' }}>
                  Actual Cost (Bought)
                </th>
              </tr>
            </thead>
            <tbody>
              {quotation.materials.map((material, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', fontWeight: 'bold' }}>
                    {material.material_name}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e0e0e0' }}>
                    {material.quantity}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #e0e0e0' }}>
                    {material.unit}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>
                    {material.unit_price}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#1976d2' }}>
                    {(material.quantity * material.unit_price).toFixed(2)}
                  </td>
                  <td style={{ padding: '4px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                    {!isViewMode ? (
                      <TextField
                        type="number"
                        value={materialCosts[index] || ''}
                        onChange={(e) => handleCostChange(index, e.target.value)}
                        placeholder="0.00"
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { border: 'none' },
                            '&:hover fieldset': { border: '1px solid #1976d2' },
                            '&.Mui-focused fieldset': { border: '1px solid #1976d2' },
                          },
                          '& .MuiInputBase-input': {
                            textAlign: 'right',
                            padding: '4px 8px',
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            color: '#2e7d32'
                          }
                        }}
                        InputProps={{}}
                      />
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32', textAlign: 'right', padding: '8px' }}>
                        {parseFloat(materialCosts[index] || 0).toFixed(2)}
                      </Typography>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#e8f5e8', fontWeight: 'bold' }}>
                <td colSpan="4" style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>
                  <strong>Grand Total:</strong>
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', color: '#1976d2' }}>
                  <strong>{quotation.totalPrice}</strong>
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', color: '#2e7d32' }}>
                  <strong>{totalActualCost.toFixed(2)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </Box>
      </Box>
    );
  };

  // Custom Cost Component - LOCAL STATE ONLY
  const CostComponent = React.memo(({ value, onChange, isViewMode }) => {
    const [cost, setCost] = React.useState(value || '');
  
    React.useEffect(() => {
      setCost(value || '');
    }, [value]);
  
    const handleChange = React.useCallback((event) => {
      const newValue = event.target.value;
      setCost(newValue);
    }, []);
  
    const handleBlur = React.useCallback(() => {
      if (onChange) {
        onChange(cost);
      }
    }, [cost, onChange]);
  
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Cost (Optional)
        </Typography>
        <TextField
          label="Actual Cost"
          type="number"
          value={cost}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isViewMode}
          fullWidth
          size="small"
          placeholder="Enter actual cost incurred"
          helperText="Enter the actual cost you incurred for this purchase order"
          InputProps={{
            startAdornment: <InputAdornment position="start">PKR</InputAdornment>
          }}
        />
      </Box>
    );
  });

  // Define purchase order form fields
  const getPurchaseOrderFields = (isViewMode = false, currentCustomer = null) => [
    {
      name: 'purchase_order_no',
      label: 'Purchase Order Number',
      type: 'text',
      required: true,
      placeholder: 'Enter purchase order number',
      tooltip: 'Unique purchase order number',
      validate: validatePurchaseOrderNo
    },
    {
      name: 'customer',
      label: 'Customer',
      type: 'custom',
      required: true,
      validate: validateCustomer,
      render: (value, onChange, isView) => (
        <CustomerSelectionComponent 
          value={value} 
          onChange={onChange} 
          isViewMode={isView} 
        />
      ),
    },
    {
      name: 'quotation',
      label: 'Quotation',
      type: 'custom',
      required: false,
      render: (value, onChange, isView) => (
        <QuotationSelectionComponent 
          value={value} 
          onChange={onChange} 
          isViewMode={isView}
          selectedCustomer={currentCustomer}
        />
      ),
    },
    {
      name: 'materials_breakdown',
      label: 'Materials Breakdown',
      type: 'custom',
      required: false,
      render: (value, onChange, isView, formData) => (
        <MaterialsBreakdownComponent 
          key={`materials-${formData?.quotation?.id || 'no-quotation'}-${selectedPurchaseOrder?.id || 'new'}`}
          quotation={formData?.quotation}
          isViewMode={isView}
          purchaseOrderMaterialCosts={materialCostsRef.current}
          onMaterialCostChange={(costs) => {
            // Store the costs in a ref that can be accessed during form submission
            materialCostsRef.current = costs;
          }}
        />
      ),
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Enter purchase order description',
      tooltip: 'Optional description for the purchase order'
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      readOnly: isViewMode,
      validate: validateStatus,
      tooltip: 'Purchase order status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'delivered', label: 'Delivered' }
      ]
    },
    {
      name: 'purchase_order_files',
      label: 'Purchase Order Files',
      type: 'custom',
      required: false,
      render: (value, onChange, isView) => (
        <FileUploadComponent 
          value={value} 
          onChange={onChange} 
          isViewMode={isView}
          purchaseOrderId={selectedPurchaseOrder?.id}
        />
      ),
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

  // Load all purchase orders
  const loadPurchaseOrders = React.useCallback(async (dateRange = appliedDateRange) => {
    if (!canRead) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      
      let apiUrl = `/api/purchase-orders?page=${page}&size=${pageSize}`;
      
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
      
      const purchaseOrderData = await get(apiUrl);
      
      if (purchaseOrderData.content && Array.isArray(purchaseOrderData.content)) {
        setRowsState({
          rows: purchaseOrderData.content,
          rowCount: purchaseOrderData.totalElements || purchaseOrderData.content.length,
        });
      } else if (Array.isArray(purchaseOrderData)) {
        setRowsState({
          rows: purchaseOrderData,
          rowCount: purchaseOrderData.length,
        });
      } else {
        setRowsState({
          rows: [],
          rowCount: 0,
        });
      }
      
    } catch (loadError) {
      setError(loadError.message || 'Failed to load purchase orders');
      toast.error('Failed to load purchase orders', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.error('Error loading purchase orders:', loadError);
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead]);

  // Load data effect - only for pagination changes when not searching
  React.useEffect(() => {
    const hasSearchCriteria = searchState.purchaseOrderNo || searchState.customerName || searchState.status;
    
    if (!hasSearchCriteria) {
      setSearchState(prev => ({ ...prev, isActive: false }));
      loadPurchaseOrders();
    }
  }, [paginationModel, loadPurchaseOrders]);

  // Sync temp date range with applied date range
  React.useEffect(() => {
    setTempDateRange({
      startDate: appliedDateRange.startDate,
      endDate: appliedDateRange.endDate,
    });
  }, [appliedDateRange]);

  // Reload data when date range changes
  React.useEffect(() => {
    const hasSearchCriteria = searchState.purchaseOrderNo || searchState.customerName || searchState.status;
    
    if (!hasSearchCriteria) {
      setSearchState(prev => ({ ...prev, isActive: false }));
      loadPurchaseOrders(appliedDateRange);
    }
  }, [appliedDateRange, loadPurchaseOrders, searchState.purchaseOrderNo, searchState.customerName, searchState.status]);

  // Auto-trigger search if URL has status parameter
  React.useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && searchState.status === urlStatus) {
      // Trigger search with current search state and applied date range
      const searchParams = {
        purchaseOrderNo: searchState.purchaseOrderNo,
        customerName: searchState.customerName,
        status: searchState.status
      };
      performSearch(searchParams, appliedDateRange);
    }
  }, [searchParams, searchState, performSearch, appliedDateRange]);


  // Action handlers
  const handleView = React.useCallback((purchaseOrderData) => {
    if (!canRead) return;
    
    // Transform the data to handle "undefined" customer values and files
    const transformedData = {
      ...purchaseOrderData,
      customer: purchaseOrderData.customer && purchaseOrderData.customer !== 'undefined' 
        ? purchaseOrderData.customer 
        : null,
      purchase_order_files: (purchaseOrderData.files || []).map(file => ({
        id: file.id,
        name: file.file_name, // This is the key change - map file_name to name
        file_name: file.file_name,
        file_path: file.file_path,
        file_size: file.file_size,
        file_type: file.file_type,
        created_at: file.created_at
      }))
    };
    
    setSelectedPurchaseOrder(transformedData);
    setModalMode('view');
    setModalOpen(true);
  }, [canRead]);

 const handleEdit = React.useCallback(async (purchaseOrderData) => {
  if (!canUpdate) return;
  
  // Get customers list (load if needed)
  let customersList = customers;
  if (customersList.length === 0) {
    try {
      const customerData = await get('/api/customers/all');
      if (Array.isArray(customerData)) {
        customersList = customerData;
        setCustomers(customerData); // Update state for future use
      } else if (customerData.data && Array.isArray(customerData.data)) {
        customersList = customerData.data;
        setCustomers(customerData.data); // Update state for future use
      }
    } catch (error) {
      console.error('Error loading customers in handleEdit:', error);
    }
  }
  
  // Convert customer string to customer object if needed
  let customerObject = null;
  if (purchaseOrderData.customer && purchaseOrderData.customer !== 'undefined') {
    if (typeof purchaseOrderData.customer === 'string') {
      // Customer is a string (customer name), find the matching customer object
      const matchingCustomer = customersList.find(c => 
        c.customerName === purchaseOrderData.customer ||
        `${c.customerName}${c.companyName ? ` (${c.companyName})` : ''}` === purchaseOrderData.customer
      );
      customerObject = matchingCustomer || null;
      
      if (!customerObject) {
        console.warn('Could not find customer object for:', purchaseOrderData.customer);
      }
    } else if (typeof purchaseOrderData.customer === 'object' && purchaseOrderData.customer !== null) {
      // Customer is already an object
      customerObject = purchaseOrderData.customer;
    }
  }
  
  // Transform the data to handle "undefined" customer values and files
  const transformedData = {
    ...purchaseOrderData,
    customer: customerObject,
    purchase_order_files: (purchaseOrderData.files || []).map(file => ({
      id: file.id,
      name: file.file_name, // This is the key change - map file_name to name
      file_name: file.file_name,
      file_path: file.file_path,
      file_size: file.file_size,
      file_type: file.file_type,
      created_at: file.created_at
    }))
  };
  
  // Initialize material costs ref if we have saved material costs
  if (purchaseOrderData.material_costs) {
    materialCostsRef.current = purchaseOrderData.material_costs;
  } else {
    materialCostsRef.current = {};
  }
  
  setSelectedPurchaseOrder(transformedData);
  setModalMode('edit');
  setModalOpen(true);
}, [canUpdate, customers, get]);
  const handleDelete = React.useCallback((purchaseOrderData) => {
    if (!canDelete) return;
    setPurchaseOrderToDelete(purchaseOrderData);
    setDeleteDialogOpen(true);
  }, [canDelete]);

  // Confirm delete function
  const confirmDelete = async () => {
    if (!purchaseOrderToDelete) return;
    
    setIsLoading(true);
    setDeleteDialogOpen(false);
    
    try {
      await del(`/api/purchase-orders/${purchaseOrderToDelete.id}`);

      toast.success(`Purchase Order #${purchaseOrderToDelete.id} deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      loadPurchaseOrders();
    } catch (deleteError) {
      toast.error(`Failed to delete purchase order: ${deleteError.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
      setPurchaseOrderToDelete(null);
    }
  };

  // Cancel delete function
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setPurchaseOrderToDelete(null);
  };

  const handleCreate = React.useCallback(() => {
    if (!canCreate) return;
    
    // Clear material costs ref for new purchase order
    materialCostsRef.current = {};
    
    setSelectedPurchaseOrder({ 
      purchase_order_no: '',
      customer: null,
      quotation: null,
      description: '',
      status: 'pending'
    });
    setModalMode('create');
    setModalOpen(true);
  }, [canCreate]);

  // Challan generation handlers
  const handleGenerateChallan = React.useCallback(async (purchaseOrderData) => {
    if (!canRead) return;
    
    console.log('Generate challan called with data:', purchaseOrderData);
    
    if (!purchaseOrderData || !purchaseOrderData.id) {
      console.error('Invalid purchase order data:', purchaseOrderData);
      toast.error('Invalid purchase order data', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    
    if (!purchaseOrderData.quotation || !purchaseOrderData.quotation.id) {
      console.error('No quotation found for purchase order:', purchaseOrderData);
      toast.error('This purchase order does not have a quotation. Cannot generate challan.', {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }
    
    setSelectedPurchaseOrderForChallan(purchaseOrderData);
    setLoadingMaterials(true);
    
    try {
      const response = await get(`/api/challans/purchase-order/${purchaseOrderData.id}/materials`);
      
      if (response.success && response.data) {
        setAvailableMaterials(response.data.materials);
        setChallanModalOpen(true);
      } else {
        toast.error('Failed to load materials for challan generation', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error loading materials for challan:', error);
      toast.error('Failed to load materials for challan generation', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoadingMaterials(false);
    }
  }, [canRead, get]);

  const handleViewChallanHistory = React.useCallback(async (purchaseOrderData) => {
    if (!canRead) return;
    
    setSelectedPurchaseOrderForChallan(purchaseOrderData);
    setLoadingChallanHistory(true);
    
    try {
      const response = await get(`/api/challans/purchase-order/${purchaseOrderData.id}/history`);
      
      if (response.success && response.data) {
        setChallanHistory(response.data.challans);
        setChallanHistoryModalOpen(true);
      } else {
        toast.error('Failed to load challan history', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error loading challan history:', error);
      toast.error('Failed to load challan history', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoadingChallanHistory(false);
    }
  }, [canRead, get]);

  // PDF handlers
  const handleDownloadPDF = React.useCallback(async (challanId, challanNo) => {
    try {
      setDownloadingPdf(prev => ({ ...prev, [challanId]: true }));
      
      // Get token for authentication
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${BASE_URL}/api/pdf/challan/${challanId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `challan-${challanNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setDownloadingPdf(prev => ({ ...prev, [challanId]: false }));
    }
  }, []);

  const handlePreviewPDF = React.useCallback(async (challanId) => {
    try {
      setLoadingPdfPreview(true);
      
      // Get token for authentication
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${BASE_URL}/api/pdf/challan/${challanId}/preview`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Get HTML content for preview
      const html = await response.text();
      
      setPdfPreviewData({
        challan: challanHistory.find(c => c.id === challanId),
        html: html
      });
      setPdfPreviewOpen(true);
      
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast.error('Failed to preview PDF', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoadingPdfPreview(false);
    }
  }, [challanHistory]);

  // Search handlers for separate fields - non-blocking input
  const handlePurchaseOrderNoChange = React.useCallback((event) => {
    const value = event.target.value;
    setSearchState(prev => ({ ...prev, purchaseOrderNo: value }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  const handleCustomerNameChange = React.useCallback((event, newValue) => {
    if (newValue && typeof newValue === 'object') {
      // User selected from dropdown
      const customerName = newValue.customerName || '';
      
      setSearchState(prev => ({ ...prev, customerName: customerName }));
      setPaginationModel(prev => ({ ...prev, page: 0 }));
      
      // Trigger search immediately when customer is selected
      const searchParams = {
        purchaseOrderNo: searchState.purchaseOrderNo,
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
  }, [searchState.purchaseOrderNo, searchState.status, performSearch]);

  const handleCustomerNameInputChange = React.useCallback((event, newInputValue) => {
    if (typeof newInputValue === 'string') {
      const trimmedValue = newInputValue.trim();
      
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
      purchaseOrderNo: searchState.purchaseOrderNo,
      customerName: searchState.customerName,
      status: value
    };
    performSearch(searchParams, appliedDateRange);
  }, [searchState.purchaseOrderNo, searchState.customerName, performSearch, appliedDateRange]);

  // Key handlers for Enter key search
  const handlePurchaseOrderNoKeyDown = React.useCallback((event) => {
    if (event.key === 'Enter') {
      setSearchState(prev => ({ ...prev, isActive: true }));
      const searchParams = {
        purchaseOrderNo: searchState.purchaseOrderNo,
        customerName: searchState.customerName,
        status: searchState.status
      };
      performSearch(searchParams, appliedDateRange);
    }
  }, [searchState.purchaseOrderNo, searchState.customerName, searchState.status, performSearch, appliedDateRange]);

  const handleCustomerNameKeyDown = React.useCallback((event) => {
    if (event.key === 'Enter') {
      setSearchState(prev => ({ ...prev, isActive: true }));
      const searchParams = {
        purchaseOrderNo: searchState.purchaseOrderNo,
        customerName: searchState.customerName,
        status: searchState.status
      };
      performSearch(searchParams, appliedDateRange);
    }
  }, [searchState.purchaseOrderNo, searchState.customerName, searchState.status, performSearch, appliedDateRange]);

  const handleClearAllSearch = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    setSearchState({
      purchaseOrderNo: '',
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
        loadPurchaseOrders();
      }
    }
  }, [isLoading, canRead, searchState.isActive, searchState, performSearch, loadPurchaseOrders]);

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
    
    // Show loading toast for create/update operations
    const loadingToastId = toast.loading(
      modalMode === 'create' 
        ? 'Creating purchase order...' 
        : 'Updating purchase order...', 
      {
        position: "top-right",
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: false,
      }
    );
    try {
      // Prepare FormData for file upload
      const submitFormData = new FormData();
      submitFormData.append('purchase_order_no', formData.purchase_order_no.trim());
      
      // Handle customer - could be object or string
      let customerId = '';
      let customerName = '';
      if (formData.customer) {
        if (typeof formData.customer === 'object' && formData.customer !== null) {
          // Customer is an object
          customerId = formData.customer.id || '';
          customerName = formData.customer.customerName || '';
        } else if (typeof formData.customer === 'string') {
          // Customer is a string, try to find it in customers list
          customerName = formData.customer;
          const matchingCustomer = customers.find(c => 
            c.customerName === formData.customer ||
            `${c.customerName}${c.companyName ? ` (${c.companyName})` : ''}` === formData.customer
          );
          customerId = matchingCustomer?.id || '';
          
          if (!customerId) {
            console.warn('Could not find customer ID for:', formData.customer);
            toast.error('Customer ID not found. Please reselect the customer.', {
              position: "top-right",
              autoClose: 3000,
            });
            setIsLoading(false);
            return;
          }
        }
      }
      
      submitFormData.append('customer', customerName);
      submitFormData.append('customer_id', customerId);
      submitFormData.append('description', formData.description || '');
      submitFormData.append('status', formData.status);
      submitFormData.append('quotation_id', formData.quotation ? formData.quotation.id : '');
      // Add material costs if available
      const materialCosts = materialCostsRef.current;
      if (materialCosts && Object.keys(materialCosts).length > 0) {
        submitFormData.append('material_costs', JSON.stringify(materialCosts));
      }
      
      submitFormData.append('created_by', user.id);
      submitFormData.append('updated_by', user.id);

      // Add files if present
      if (formData.purchase_order_files && Array.isArray(formData.purchase_order_files)) {
        formData.purchase_order_files.forEach((file, index) => {
          if (file instanceof File) {
            submitFormData.append('purchase_order_files', file);
          }
        });
      }

      let response;
      
      if (modalMode === 'create') {
        response = await post('/api/purchase-orders', submitFormData);
      } else {
        response = await put(`/api/purchase-orders/${selectedPurchaseOrder.id}`, submitFormData);
      }

      const successMessage = modalMode === 'create' 
        ? 'Purchase Order created successfully!' 
        : 'Purchase Order updated successfully!';
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setModalOpen(false);
      loadPurchaseOrders();
    } catch (submitError) {
      let errorMessage = `Failed to ${modalMode} purchase order`;
      
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
      
      // Dismiss loading toast and show error
      toast.dismiss(loadingToastId);
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

  // Column definitions for purchase orders
  const columns = React.useMemo(
    () => [
      { 
        field: 'id', 
        headerName: 'ID',
        width: 70,
      },
      {
        field: 'purchase_order_no',
        headerName: 'PO Number',
        width: 150,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ 
            fontWeight: params.value ? 'bold' : 'normal',
            fontStyle: params.value ? 'normal' : 'italic',
            color: params.value ? 'text.primary' : 'text.secondary'
          }}>
            {params.value || 'No PO Number'}
          </Typography>
        ),
      },
      {
        field: 'customer',
        headerName: 'Customer',
        width: 180,
      },
      {
        field: 'quotation',
        headerName: 'Quotation',
        width: 200,
        renderCell: (params) => {
          if (params.value && params.value.title) {
            return (
              <Typography variant="body2">
                {params.value.title}
              </Typography>
            );
          }
          return (
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
              No quotation
            </Typography>
          );
        },
      },
      {
        field: 'description',
        headerName: 'Description',
        width: 200,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px'
          }}>
            {params.value || 'No description'}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => {
          const getStatusColor = (status) => {
            switch (status) {
              case 'pending': return 'warning';
              case 'delivered': return 'success';
              default: return 'default';
            }
          };
          
          return (
            <Chip 
              label={params.value} 
              variant="outlined" 
              size="small"
              color={getStatusColor(params.value)}
            />
          );
        },
      },
      {
        field: 'created_at',
        headerName: 'Created At',
        width: 180,
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
              <Typography variant="body2">
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
      {
        field: 'challan_actions',
        headerName: 'Challan',
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Generate Challan">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateChallan(params.row);
                }}
                color="primary"
                disabled={!params.row.quotation || !params.row.quotation.id}
              >
                <LocalShipping />
              </IconButton>
            </Tooltip>
            <Tooltip title="Challan History">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewChallanHistory(params.row);
                }}
                color="info"
              >
                <History />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleGenerateChallan, handleViewChallanHistory],
  );

  const pageTitle = 'Purchase Order Management';

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
            {/* Purchase Order Number Search */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Purchase Order Number"
                placeholder="Enter PO number..."
                value={searchState.purchaseOrderNo}
                onChange={handlePurchaseOrderNoChange}
                onKeyDown={handlePurchaseOrderNoKeyDown}
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
                    label="Customer Name"
                    placeholder="Type customer name..."
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
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
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
                  searchState.purchaseOrderNo && `PO: ${searchState.purchaseOrderNo}`,
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

      {/* Dynamic Modal for Purchase Order CRUD */}
      <DynamicModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        title={`${modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Edit' : 'View'} Purchase Order`}
        initialData={selectedPurchaseOrder || {}}
        fields={getPurchaseOrderFields(modalMode === 'view', currentModalCustomer)}
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
            Are you sure you want to delete purchase order <strong>#{purchaseOrderToDelete?.id}</strong>?
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

      {/* Challan Generation Modal */}
      <Dialog
        open={challanModalOpen}
        onClose={() => setChallanModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '600px',
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#1976d2', 
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <LocalShipping />
          Generate Delivery Challan
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {loadingMaterials ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ChallanGenerationForm 
              availableMaterials={availableMaterials}
              purchaseOrder={selectedPurchaseOrderForChallan}
              onClose={() => setChallanModalOpen(false)}
              onSuccess={() => {
                setChallanModalOpen(false);
                loadPurchaseOrders();
                toast.success('Challan generated successfully!', {
                  position: "top-right",
                  autoClose: 3000,
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Challan History Modal */}
      <Dialog
        open={challanHistoryModalOpen}
        onClose={() => setChallanHistoryModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '500px',
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#1976d2', 
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <History />
          Challan History - {selectedPurchaseOrderForChallan?.purchase_order_no}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {loadingChallanHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ChallanHistoryTable 
              challanHistory={challanHistory}
              purchaseOrder={selectedPurchaseOrderForChallan}
              onDownloadPDF={handleDownloadPDF}
              onPreviewPDF={handlePreviewPDF}
              downloadingPdf={downloadingPdf}
              loadingPdfPreview={loadingPdfPreview}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setChallanHistoryModalOpen(false)}
            variant="outlined"
          >
            Close
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
            PDF Preview - Challan {pdfPreviewData?.challan?.challan_no}
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
                title={`Challan ${pdfPreviewData.challan?.challan_no} Preview`}
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
