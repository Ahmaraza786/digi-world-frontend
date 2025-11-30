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
import { Add, Delete, Edit, FileDownload, Search, Clear, Visibility, Email } from '@mui/icons-material';

const INITIAL_PAGE_SIZE = 10;

export default function QuotationManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, hasPermission, token } = useAuth();
  
  // Check user permissions
  const canRead = user?.permissions?.quotation?.includes('read') || false;
  const canCreate = user?.permissions?.quotation?.includes('create') || false;
  const canUpdate = user?.permissions?.quotation?.includes('update') || false;
  const canDelete = user?.permissions?.quotation?.includes('delete') || false;

  const { get, post, put, del } = useApi();

  const [rowsState, setRowsState] = React.useState({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [exportingQuotationId, setExportingQuotationId] = React.useState(null);
  const [viewingPdfQuotationId, setViewingPdfQuotationId] = React.useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState('view');
  const [selectedQuotation, setSelectedQuotation] = React.useState(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [quotationToDelete, setQuotationToDelete] = React.useState(null);

  // PDF preview modal state
  const [pdfPreviewOpen, setPdfPreviewOpen] = React.useState(false);
  const [pdfPreviewData, setPdfPreviewData] = React.useState(null);
  const [loadingPdfPreview, setLoadingPdfPreview] = React.useState(false);

  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailFormData, setEmailFormData] = React.useState({
    recipientEmail: '',
    message: ''
  });
  const [quotationToEmail, setQuotationToEmail] = React.useState(null);
  const [sendingEmail, setSendingEmail] = React.useState(false);

  // Data for dropdowns
  const [materials, setMaterials] = React.useState([]);
  const [customers, setCustomers] = React.useState([]);
  const [loadingMaterials, setLoadingMaterials] = React.useState(false);
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);
  
  // Customer material prices state
  const [customerMaterialPrices, setCustomerMaterialPrices] = React.useState([]);
  const [loadingCustomerPrices, setLoadingCustomerPrices] = React.useState(false);
  
  // Current customer in modal state
  const [currentModalCustomer, setCurrentModalCustomer] = React.useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [loadingSearch, setLoadingSearch] = React.useState(false);
  const [searchPage, setSearchPage] = React.useState(0);
  const [hasMoreSearchResults, setHasMoreSearchResults] = React.useState(false);
  
  // Search optimization state
  const [searchCache, setSearchCache] = React.useState(new Map());
  const [abortController, setAbortController] = React.useState(null);
  const debounceTimeoutRef = React.useRef(null);
  const [selectedCustomer, setSelectedCustomer] = React.useState(null);

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

  // Load materials for dropdown
  const loadMaterials = React.useCallback(async () => {
    setLoadingMaterials(true);
    try {
      console.log('Loading materials...');
      const materialData = await get('/api/materials/all');
      console.log('Material data received:', materialData);
      
      if (Array.isArray(materialData)) {
        console.log('Setting materials from array:', materialData);
        setMaterials(materialData);
      } else if (materialData.data && Array.isArray(materialData.data)) {
        console.log('Setting materials from data property:', materialData.data);
        setMaterials(materialData.data);
      } else {
        console.log('No valid material data found, setting empty array');
        setMaterials([]);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      toast.error('Failed to load materials', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoadingMaterials(false);
    }
  }, [get]);

  // Load customers for dropdown
  const loadCustomers = React.useCallback(async () => {
    setLoadingCustomers(true);
    try {
      console.log('Loading customers...');
      const customerData = await get('/api/customers/all');
      console.log('Customer data received:', customerData);
      
      if (Array.isArray(customerData)) {
        console.log('Setting customers from array:', customerData);
        setCustomers(customerData);
      } else if (customerData.data && Array.isArray(customerData.data)) {
        console.log('Setting customers from data property:', customerData.data);
        setCustomers(customerData.data);
      } else {
        console.log('No valid customer data found, setting empty array');
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

  // Load customer material prices
  const loadCustomerMaterialPrices = React.useCallback(async (customerId) => {
    if (!customerId) {
      setCustomerMaterialPrices([]);
      return;
    }

    setLoadingCustomerPrices(true);
    try {
      console.log('Loading customer material prices for customer ID:', customerId);
      const response = await get(`/api/customers/${customerId}/materials`);
      console.log('Customer material prices received:', response);
      
      if (response.success && response.data && response.data.materials) {
        console.log('Setting customer material prices:', response.data.materials);
        setCustomerMaterialPrices(response.data.materials);
      } else {
        console.log('No customer material prices found, setting empty array');
        setCustomerMaterialPrices([]);
      }
    } catch (error) {
      console.error('Error loading customer material prices:', error);
      toast.error('Failed to load customer material prices', {
        position: "top-right",
        autoClose: 3000,
      });
      setCustomerMaterialPrices([]);
    } finally {
      setLoadingCustomerPrices(false);
    }
  }, [get]);

  // Optimized search customers with caching and request cancellation
  const searchCustomers = React.useCallback(async (query, page = 0, append = false) => {
    const trimmedQuery = query?.trim();
    
    // Minimum character threshold
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSearchResults([]);
      setHasMoreSearchResults(false);
      return;
    }

    // Check cache first
    const cacheKey = `${trimmedQuery}_${page}`;
    if (searchCache.has(cacheKey) && !append) {
      const cachedData = searchCache.get(cacheKey);
      setSearchResults(cachedData.customers);
      setHasMoreSearchResults(cachedData.hasMore);
      setSearchPage(page);
      return;
    }

    // Cancel previous request
    if (abortController) {
      abortController.abort();
    }

    // Create new abort controller
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    setLoadingSearch(true);
    
    try {
      const response = await get(`/api/customers/search?search=${encodeURIComponent(trimmedQuery)}&page=${page}&size=10`, {
        signal: newAbortController.signal
      });
      
      if (response.success && response.customers) {
        const newResults = append ? [...searchResults, ...response.customers] : response.customers;
        
        setSearchResults(newResults);
        setHasMoreSearchResults(response.hasMore || false);
        setSearchPage(page);
        
        // Cache the results
        setSearchCache(prev => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, {
            customers: response.customers,
            hasMore: response.hasMore || false,
            timestamp: Date.now()
          });
          
          // Limit cache size to 50 entries
          if (newCache.size > 50) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
          }
          
          return newCache;
        });
      } else {
        setSearchResults([]);
        setHasMoreSearchResults(false);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error searching customers:', error);
        setSearchResults([]);
        setHasMoreSearchResults(false);
      }
    } finally {
      setLoadingSearch(false);
      setAbortController(null);
    }
  }, [get, searchCache, searchResults, abortController]);

  // Industry-standard debounced search with proper cleanup
  const debouncedSearch = React.useCallback((query) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Cancel any pending request
    if (abortController) {
      abortController.abort();
    }
    
    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      searchCustomers(query, 0, false);
    }, 500); // Increased to 500ms for better performance
  }, [searchCustomers, abortController]);

  // Cleanup function
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  // Cache cleanup effect - remove old cache entries
  React.useEffect(() => {
    const cleanupCache = () => {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      setSearchCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev) {
          if (now - value.timestamp < maxAge) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    };

    const interval = setInterval(cleanupCache, 60000); // Clean every minute
    return () => clearInterval(interval);
  }, []);

  // Load materials and customers when modal opens
  React.useEffect(() => {
    if (modalOpen && (modalMode === 'create' || modalMode === 'edit')) {
      console.log('Modal opened, loading materials and customers...');
      if (user && token) {
        loadMaterials();
        loadCustomers();
      }
    }
  }, [modalOpen, modalMode, loadMaterials, loadCustomers, user, token]);

  // Load customer material prices when editing a quotation with a customer
  React.useEffect(() => {
    if (modalOpen && modalMode === 'edit' && selectedQuotation && selectedQuotation.customer && selectedQuotation.customer.id) {
      console.log('Loading customer material prices for edit mode...');
      setCurrentModalCustomer(selectedQuotation.customer);
      loadCustomerMaterialPrices(selectedQuotation.customer.id);
    } else if (modalOpen && modalMode === 'create') {
      // Clear customer prices when creating new quotation
      setCurrentModalCustomer(null);
      setCustomerMaterialPrices([]);
    }
  }, [modalOpen, modalMode, selectedQuotation, loadCustomerMaterialPrices]);

  // Validation functions
  const validateMaterials = (materials) => {
    console.log('Validating materials:', materials);
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return 'At least one material is required';
    }
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      if (!material.material_id) return `Material ${i + 1}: Material selection is required`;
      if (!material.quantity || material.quantity <= 0) return `Material ${i + 1}: Quantity must be a positive integer`;
      if (material.unit_price === undefined || material.unit_price < 0) return `Material ${i + 1}: Unit price must be a non-negative integer`;
      if (!material.unit) return `Material ${i + 1}: Unit type is required`;
      const validUnits = ['FT', 'MTR', 'EA', 'No', 'No,s', 'JOB', 'LOT', 'Pair'];
      if (!validUnits.includes(material.unit)) return `Material ${i + 1}: Invalid unit type`;
    }
    return '';
  };

  // Calculate total price from materials
  const calculateTotalPrice = (materials) => {
    if (!materials || !Array.isArray(materials)) return 0;
    return materials.reduce((total, material) => {
      const quantity = material.quantity || 0;
      const unitPrice = material.unit_price || 0;
      return total + (quantity * unitPrice);
    }, 0);
  };

  const validateTitle = (title) => {
    console.log('Validating title:', title);
    if (!title || title.trim() === '') return 'Title is required';
    if (title.length > 255) return 'Title must be 255 characters or less';
    return '';
  };

  const validateCustomer = (customer) => {
    console.log('Validating customer:', customer);
    if (!customer) return 'Customer is required';
    return '';
  };

  const validateStatus = (status) => {
    if (!status) return 'Status is required';
    if (!['pending', 'po_received'].includes(status)) return 'Invalid status';
    return '';
  };

  // Custom Material Selection Component
  const MaterialSelectionComponent = ({ value, onChange, isViewMode, selectedCustomer }) => {
    const [selectedMaterials, setSelectedMaterials] = React.useState(value || []);
    const [materialSearch, setMaterialSearch] = React.useState('');

    React.useEffect(() => {
      setSelectedMaterials(value || []);
    }, [value]);

    // Helper function to get customer-specific price for a material
    const getCustomerPrice = (materialId) => {
      const customerPrice = customerMaterialPrices.find(
        price => price.materialId === materialId
      );
      return customerPrice ? customerPrice.customerPrice : null;
    };

    const handleAddMaterial = (material) => {
      if (isViewMode) return;
      
      console.log('Adding material:', material);
      
      // Check if material is already selected
      const isAlreadySelected = selectedMaterials.some(
        selectedMaterial => selectedMaterial.material_id === material.id
      );
      
      if (isAlreadySelected) {
        toast.warning(`Material "${material.name}" is already selected!`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }
      
      // Get customer-specific price if available, otherwise use default price
      const customerPrice = getCustomerPrice(material.id);
      const unitPrice = customerPrice !== null ? customerPrice : Math.round(material.unitPrice || 0);
      
      const newMaterial = {
        material_id: material.id,
        material_name: material.name,
        material_type: material.materialType || 'material', // Include material type
        quantity: 1,
        unit_price: unitPrice,
        unit: 'EA' // Default unit
      };
      
      const updatedMaterials = [...selectedMaterials, newMaterial];
      console.log('Updated materials:', updatedMaterials);
      setSelectedMaterials(updatedMaterials);
      onChange(updatedMaterials);
    };

    const handleRemoveMaterial = (index) => {
      if (isViewMode) return;
      
      const updatedMaterials = selectedMaterials.filter((_, i) => i !== index);
      setSelectedMaterials(updatedMaterials);
      onChange(updatedMaterials);
    };

    const handleUpdateMaterial = (index, field, newValue) => {
      if (isViewMode) return;
      
      const updatedMaterials = selectedMaterials.map((material, i) => 
        i === index ? { ...material, [field]: newValue } : material
      );
      setSelectedMaterials(updatedMaterials);
      onChange(updatedMaterials);
    };

    const filteredMaterials = materials.filter(material => {
      if (!material) return false;
      
      // Filter out already selected materials
      const isAlreadySelected = selectedMaterials.some(
        selectedMaterial => selectedMaterial.material_id === material.id
      );
      if (isAlreadySelected) return false;
      
      // Filter by search term
      const searchTerm = materialSearch.toLowerCase();
      return material.name && material.name.toLowerCase().includes(searchTerm);
    });

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Materials {selectedMaterials.length > 0 && `(${selectedMaterials.length} selected)`}
        </Typography>
        
        {!isViewMode && (
          <Box sx={{ position: 'relative' }}>
            {!selectedCustomer ? (
              <TextField
                label="Add materials"
                placeholder="Please select a customer first"
                size="small"
                fullWidth
                disabled
                sx={{ mb: 2 }}
                helperText="You must select a customer before adding materials"
              />
            ) : (
              <Autocomplete
                options={filteredMaterials}
                getOptionLabel={(option) => {
                  const customerPrice = getCustomerPrice(option.id);
                  const displayPrice = customerPrice !== null ? customerPrice : Math.round(option?.unitPrice || 0);
                  const priceLabel = customerPrice !== null ? `Customer Price: PKR ${displayPrice}` : `Default Price: PKR ${displayPrice}`;
                  return `${option?.name || 'Unknown'} - ${priceLabel}`;
                }}
                value={null}
                onChange={(event, newValue) => {
                  if (newValue) {
                    handleAddMaterial(newValue);
                    setMaterialSearch('');
                  }
                }}
                inputValue={materialSearch}
                onInputChange={(event, newInputValue) => {
                  setMaterialSearch(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Add materials"
                    placeholder="Type to search..."
                    size="small"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingCustomerPrices && (
                            <CircularProgress color="inherit" size={20} sx={{ mr: 1 }} />
                          )}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                loading={loadingMaterials}
                noOptionsText={materials.length === 0 ? "No materials available" : "All materials selected"}
                sx={{ mb: 2 }}
              />
            )}
            
            {/* Customer Price Loading Indicator */}
            {loadingCustomerPrices && (
              <Box sx={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                mt: 1, 
                p: 1, 
                bgcolor: '#f5f5f5', 
                borderRadius: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                zIndex: 1
              }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="caption" color="textSecondary">
                  Loading customer-specific prices...
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {selectedMaterials.map((material, index) => (
          <Card key={index} sx={{ mb: 1, border: '1px solid #e0e0e0' }}>
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" fontWeight="bold">
                    {material?.material_name || 'Unknown Material'}
                  </Typography>
                  {getCustomerPrice(material?.material_id) !== null && (
                    <Chip 
                      label="Customer Price" 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ mt: 0.5, fontSize: '0.7rem', height: '20px' }}
                    />
                  )}
                </Grid>
                
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Quantity"
                    type="number"
                    size="small"
                    value={material?.quantity || 0}
                    onChange={(e) => handleUpdateMaterial(index, 'quantity', parseInt(e.target.value) || 0)}
                    disabled={isViewMode}
                    inputProps={{ min: 1, step: 1 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Unit Type"
                    select
                    size="small"
                    value={material?.unit || 'EA'}
                    onChange={(e) => handleUpdateMaterial(index, 'unit', e.target.value)}
                    disabled={isViewMode}
                    fullWidth
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="FT">FT</option>
                    <option value="MTR">MTR</option>
                    <option value="EA">EA</option>
                    <option value="No">No</option>
                    <option value="No,s">No,s</option>
                    <option value="JOB">JOB</option>
                    <option value="LOT">LOT</option>
                    <option value="Pair">Pair</option>
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    label="Unit Price"
                    type="number"
                    size="small"
                    value={material?.unit_price || 0}
                    onChange={(e) => handleUpdateMaterial(index, 'unit_price', parseInt(e.target.value) || 0)}
                    disabled={isViewMode}
                    inputProps={{ min: 0, step: 1 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    Total: PKR {((material?.quantity || 0) * (material?.unit_price || 0)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={1}>
                  {!isViewMode && (
                    <IconButton
                      onClick={() => handleRemoveMaterial(index)}
                      color="error"
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}

        {selectedMaterials.length === 0 && (
          <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
            No materials selected
          </Typography>
        )}

        {selectedMaterials.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
              Total Price: PKR {calculateTotalPrice(selectedMaterials).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Custom Customer Selection Component
  const CustomerSelectionComponent = ({ value, onChange, isViewMode }) => {
    const [customerSearch, setCustomerSearch] = React.useState('');
    const [selectedCustomer, setSelectedCustomer] = React.useState(value || null);

    React.useEffect(() => {
      setSelectedCustomer(value || null);
    }, [value]);

    const handleCustomerSelect = (customer) => {
      if (isViewMode) return;
      console.log('Selecting customer:', customer);
      setSelectedCustomer(customer);
      setCurrentModalCustomer(customer); // Update modal customer state
      onChange(customer);
      
      // Load customer material prices when customer is selected
      if (customer && customer.id) {
        loadCustomerMaterialPrices(customer.id);
      } else {
        setCustomerMaterialPrices([]);
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

    console.log('Customers state:', customers);
    console.log('Filtered customers:', filteredCustomers);
    console.log('Customer search term:', customerSearch);

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
            value={selectedCustomer ? `${selectedCustomer.customerName}${selectedCustomer.companyName ? ` (${selectedCustomer.companyName})` : ''}` : ''}
            disabled
            fullWidth
            size="small"
          />
        )}

        {selectedCustomer && (
          <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
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
          </Box>
        )}
      </Box>
    );
  };

  // Define quotation form fields
  const getQuotationFields = (isViewMode = false, currentCustomer = null) => [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'Enter quotation title',
      tooltip: 'Title or description for the quotation',
      validate: validateTitle
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
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      readOnly: isViewMode,
      validate: validateStatus,
      tooltip: 'Quotation status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'po_received', label: 'PO Received' }
      ]
    },
    {
      name: 'materials',
      label: 'Materials',
      type: 'custom',
      required: true,
      validate: validateMaterials,
      render: (value, onChange, isView) => (
        <MaterialSelectionComponent 
          value={value} 
          onChange={onChange} 
          isViewMode={isView}
          selectedCustomer={currentCustomer}
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

  // API call to fetch quotations with pagination
  const loadQuotations = React.useCallback(async () => {
    if (!canRead) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      
      let apiUrl = `/api/quotations?page=${page}&size=${pageSize}`;
      
      // Add search parameter if a customer is selected or search query exists
      if (selectedCustomer && selectedCustomer.id) {
        // Use customer ID for precise matching
        apiUrl += `&customer_id=${selectedCustomer.id}`;
      } else if (searchQuery && searchQuery.trim()) {
        // Use customer name for text search
        apiUrl += `&customer_name=${encodeURIComponent(searchQuery.trim())}`;
      }
      
      const quotationData = await get(apiUrl);
      
      if (quotationData.quotations && Array.isArray(quotationData.quotations)) {
        setRowsState({
          rows: quotationData.quotations,
          rowCount: quotationData.totalCount || quotationData.quotations.length,
        });
      } else if (Array.isArray(quotationData)) {
        setRowsState({
          rows: quotationData,
          rowCount: quotationData.length,
        });
      } else {
        setRowsState({
          rows: [],
          rowCount: 0,
        });
      }
      
    } catch (loadError) {
      setError(loadError.message || 'Failed to load quotations');
      toast.error('Failed to load quotations', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.error('Error loading quotations:', loadError);
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead, searchQuery, selectedCustomer]);

  // Load data when component mounts or pagination changes
  React.useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  // Action handlers
  const handleView = React.useCallback((quotationData) => {
    if (!canRead) return;
    setSelectedQuotation(quotationData);
    setModalMode('view');
    setModalOpen(true);
  }, [canRead]);

  const handleEdit = React.useCallback((quotationData) => {
    if (!canUpdate) return;
    setSelectedQuotation(quotationData);
    setModalMode('edit');
    setModalOpen(true);
  }, [canUpdate]);

  const handleDelete = React.useCallback((quotationData) => {
    if (!canDelete) return;
    setQuotationToDelete(quotationData);
    setDeleteDialogOpen(true);
  }, [canDelete]);

  const handleExport = React.useCallback(async (quotationData) => {
    try {
      console.log('Exporting quotation:', quotationData);
      
      // Set loading state
      setExportingQuotationId(quotationData.id);
      
      // Show loading toast
      const loadingToastId = toast.loading('Preparing PDF for download...', {
        position: "top-right",
        autoClose: false,
      });
      
      // Create a download link
      const exportUrl = `${BASE_URL}/api/export/quotation/${quotationData.id}`;
      
      // Generate filename with title + timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: YYYY-MM-DDTHH-MM-SS
      const title = quotationData.title || 'quotation';
      // Sanitize title: remove invalid filename characters and replace spaces with underscores
      const sanitizedTitle = title
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit length to 50 characters
      const filename = `${sanitizedTitle}_${timestamp}.pdf`;
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = filename;
      
      // Add authorization header by using fetch first
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export quotation');
      }
      
      // Get the blob data
      const blob = await response.blob();
      console.log('PDF blob received:', {
        size: blob.size,
        type: blob.type,
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
      
      // Validate blob
      if (blob.size === 0) {
        throw new Error('Received empty PDF file');
      }
      
      if (blob.type !== 'application/pdf') {
        console.warn('Unexpected content type:', blob.type);
      }
      
      // Create object URL and trigger download
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success('Quotation downloaded successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export quotation', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      // Clear loading state
      setExportingQuotationId(null);
    }
  }, [token]);

  const handleViewPdf = React.useCallback(async (quotationData) => {
    try {
      setLoadingPdfPreview(true);
      setViewingPdfQuotationId(quotationData.id);
      
      // Show loading toast
      const loadingToastId = toast.loading('Loading PDF preview...', {
        position: "top-right",
        autoClose: false,
      });
      
      console.log('Loading PDF preview for quotation:', quotationData);
      
      const response = await get(`/api/export/quotation/${quotationData.id}/html`);
      
      if (response.success && response.html) {
        setPdfPreviewData({
          quotation: quotationData,
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
      setViewingPdfQuotationId(null);
    }
  }, [get]);

  // Handle opening email dialog
  const handleOpenEmailDialog = React.useCallback((quotationData) => {
    if (!canRead) return;
    
    // Check if quotation is pending
    if (quotationData.status !== 'pending') {
      toast.warning('Only pending quotations can be sent via email', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    setQuotationToEmail(quotationData);
    // Use customer email if available, otherwise empty (user can fill in)
    const customerEmail = quotationData.customer?.email || '';
    const companyName = quotationData.customer?.companyName || '';
    
    setEmailFormData({
      recipientEmail: customerEmail,
      message: `Dear ${companyName ? companyName + ' Team' : quotationData.customer?.customerName || 'Customer'},\n\nPlease find attached our quotation for your review.\n\nIf you need any further information or would like to discuss the details, please feel free to contact us.\n\nBest regards,\nDigital World Sales Team`
    });
    setEmailDialogOpen(true);
  }, [canRead]);

  // Handle sending email
  const handleSendEmail = React.useCallback(async () => {
    if (!quotationToEmail) return;

    // Validate email
    if (!emailFormData.recipientEmail || emailFormData.recipientEmail.trim() === '') {
      toast.error('Recipient email is required', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFormData.recipientEmail)) {
      toast.error('Invalid email format', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Validate message
    if (!emailFormData.message || emailFormData.message.trim() === '') {
      toast.error('Email message is required', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setSendingEmail(true);

    try {
      const response = await post(`/api/quotations/${quotationToEmail.id}/send-email`, {
        recipientEmail: emailFormData.recipientEmail.trim(),
        message: emailFormData.message.trim()
      });

      if (response.success) {
        toast.success('Quotation sent via email successfully!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // Close dialog and reset form
        setEmailDialogOpen(false);
        setEmailFormData({
          recipientEmail: '',
          message: ''
        });
        setQuotationToEmail(null);
      } else {
        throw new Error(response.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Send email error:', error);
      toast.error(`Failed to send email: ${error.message || 'Unknown error'}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setSendingEmail(false);
    }
  }, [quotationToEmail, emailFormData, post]);

  // Handle closing email dialog
  const handleCloseEmailDialog = React.useCallback(() => {
    if (sendingEmail) return; // Prevent closing while sending
    
    setEmailDialogOpen(false);
    setEmailFormData({
      recipientEmail: '',
      message: ''
    });
    setQuotationToEmail(null);
  }, [sendingEmail]);

  // Confirm delete function
  const confirmDelete = async () => {
    if (!quotationToDelete) return;
    
    setIsLoading(true);
    setDeleteDialogOpen(false);
    
    try {
      await del(`/api/quotations/${quotationToDelete.id}`);

      toast.success(`Quotation #${quotationToDelete.id} deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      loadQuotations();
    } catch (deleteError) {
      toast.error(`Failed to delete quotation: ${deleteError.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
      setQuotationToDelete(null);
    }
  };

  // Cancel delete function
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setQuotationToDelete(null);
  };

  const handleCreate = React.useCallback(() => {
    if (!canCreate) return;
    console.log('Creating quotation modal...');
    setSelectedQuotation({ 
      title: '',
      materials: [], 
      status: 'pending',
      customer: null
    });
    setModalMode('create');
    setModalOpen(true);
    console.log('Modal should be open now');
  }, [canCreate]);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading && canRead) {
      loadQuotations();
    }
  }, [isLoading, loadQuotations, canRead]);

  // Optimized search handlers
  const handleSearchChange = React.useCallback((event, newValue) => {
    // Handle both string input and object selection
    let searchText = '';
    if (typeof newValue === 'string') {
      searchText = newValue.trim();
    } else if (newValue && typeof newValue === 'object') {
      // User selected an option from dropdown
      searchText = newValue.displayName || newValue.customerName || '';
      setSearchQuery(searchText);
      setSearchResults([]);
      setHasMoreSearchResults(false);
      // Store the selected customer for quotation search
      setSelectedCustomer(newValue);
      // Trigger search for quotations by this customer
      setPaginationModel(prev => ({ ...prev, page: 0 }));
      loadQuotations();
      return;
    }
    
    setSearchQuery(searchText);
    
    if (searchText.length >= 2) {
      debouncedSearch(searchText);
    } else {
      // Clear results immediately for short queries
      setSearchResults([]);
      setHasMoreSearchResults(false);
    }
  }, [debouncedSearch, loadQuotations]);

  const handleSearchInputChange = React.useCallback((event, newInputValue) => {
    // Only handle string input changes
    if (typeof newInputValue === 'string') {
      const trimmedValue = newInputValue.trim();
      setSearchQuery(trimmedValue);
      
      if (trimmedValue.length >= 2) {
        debouncedSearch(trimmedValue);
      } else {
        // Clear results immediately for short queries
        setSearchResults([]);
        setHasMoreSearchResults(false);
      }
    }
  }, [debouncedSearch]);


  const handleClearSearch = React.useCallback(() => {
    // Cancel any pending requests
    if (abortController) {
      abortController.abort();
    }
    
    // Clear timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setHasMoreSearchResults(false);
    setSelectedCustomer(null);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, [abortController]);

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
      // Calculate total price from materials
      const calculatedTotalPrice = calculateTotalPrice(formData.materials);
      
      // Prepare submit data according to API requirements
      const submitData = {
        title: formData.title.trim(),
        materials: formData.materials,
        total_price: calculatedTotalPrice,
        customer_id: formData.customer.id,
        customer_name: formData.customer.customerName,
        status: formData.status,
        created_by: user.id,
        updated_by: user.id
      };

      let response;
      
      if (modalMode === 'create') {
        response = await post('/api/quotations', submitData);
      } else {
        response = await put(`/api/quotations/${selectedQuotation.id}`, submitData);
      }

      const successMessage = modalMode === 'create' 
        ? 'Quotation created successfully!' 
        : 'Quotation updated successfully!';
      
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setModalOpen(false);
      loadQuotations();
    } catch (submitError) {
      let errorMessage = `Failed to ${modalMode} quotation`;
      
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

  // Column definitions for quotations
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
        field: 'title',
        headerName: 'Title',
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
              fontWeight: params.value ? 'bold' : 'normal',
              fontStyle: params.value ? 'normal' : 'italic',
              color: params.value ? 'text.primary' : 'text.secondary'
            }}
          >
            {params.value || 'No title'}
          </Typography>
        ),
      },
      {
        field: 'customerName',
        headerName: 'Customer',
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
        field: 'customerCompanyName',
        headerName: 'Company Name',
        width: 200,
        align: 'left',
        headerAlign: 'left',
        valueGetter: (value, row) => {
          return row?.customer?.companyName || 'N/A';
        },
        renderCell: (params) => {
          const companyName = params.row?.customer?.companyName;
          return (
            <Typography 
              variant="body2" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: '100%',
                lineHeight: 1.5,
                fontStyle: companyName ? 'normal' : 'italic',
                color: companyName ? 'text.primary' : 'text.secondary'
              }}
            >
              {companyName || 'N/A'}
            </Typography>
          );
        },
      },
      {
        field: 'materials',
        headerName: 'Materials',
        width: 100,
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
            {params.value?.length || 0} item(s)
          </Typography>
        ),
      },
      {
        field: 'totalPrice',
        headerName: 'Total Price',
        width: 120,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => {
          const formattedPrice = typeof params.value === 'number' 
            ? params.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
            : (params.value ? Number(params.value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0');
          return (
            <Typography 
              variant="body2" 
              fontWeight="bold" 
              color="primary"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: '100%',
                lineHeight: 1.5
              }}
            >
              PKR {formattedPrice}
            </Typography>
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
              case 'pending': return 'warning';
              case 'po_received': return 'success';
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

  // Optimized Search Component
  const SearchComponent = React.useMemo(() => (
    <Box sx={{ mb: 2, maxWidth: 400, position: 'relative' }}>
      <Autocomplete
        freeSolo
        options={searchResults}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return option.displayName || '';
        }}
        value={searchQuery}
        onChange={handleSearchChange}
        onInputChange={handleSearchInputChange}
        loading={loadingSearch}
        loadingText="Searching customers..."
        noOptionsText={searchQuery.length < 2 ? "Type at least 2 characters to search" : "No customers found"}
        filterOptions={(options) => options} // Disable client-side filtering since we're doing server-side
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search by customer name"
            placeholder="Type customer name..."
            size="small"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {loadingSearch ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : searchQuery ? (
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
          <Box component="li" {...props}>
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {option.customerName}
              </Typography>
              {option.companyName && (
                <Typography variant="caption" color="textSecondary">
                  {option.companyName}
                </Typography>
              )}
              {option.telephoneNumber && (
                <Typography variant="caption" color="textSecondary" display="block">
                  📞 {option.telephoneNumber}
                </Typography>
              )}
            </Box>
          </Box>
        )}
        ListboxProps={{
          onScroll: (event) => {
            const { target } = event;
            if (target.scrollTop + target.clientHeight === target.scrollHeight && hasMoreSearchResults && !loadingSearch) {
              searchCustomers(searchQuery, searchPage + 1, true);
            }
          },
          style: {
            maxHeight: '300px', // Fixed height to prevent layout shifts
            overflow: 'auto'
          }
        }}
        // Performance and UI optimizations
        disableListWrap={false}
        disablePortal={true} // Keep dropdown in document flow to prevent layout shifts
        openOnFocus={false}
        selectOnFocus={false}
        clearOnBlur={false}
        handleHomeEndKeys={false}
        // Styling to prevent layout shifts
        sx={{
          '& .MuiAutocomplete-popper': {
            position: 'relative !important',
            transform: 'none !important',
            top: 'auto !important',
            left: 'auto !important',
            right: 'auto !important',
            bottom: 'auto !important',
            width: '100% !important',
            maxHeight: '300px',
            overflow: 'auto',
            zIndex: 1300,
            transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out'
          },
          '& .MuiAutocomplete-listbox': {
            maxHeight: '300px',
            overflow: 'auto',
            padding: 0,
            transition: 'opacity 0.2s ease-in-out'
          },
          '& .MuiAutocomplete-paper': {
            margin: 0,
            boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out'
          },
          '& .MuiAutocomplete-root': {
            transition: 'all 0.2s ease-in-out'
          }
        }}
        // Additional props to prevent layout issues
        componentsProps={{
          popper: {
            placement: 'bottom-start',
            modifiers: [
              {
                name: 'preventOverflow',
                enabled: true,
                options: {
                  boundary: 'viewport'
                }
              }
            ]
          }
        }}
      />
    </Box>
  ), [
    searchResults, 
    searchQuery, 
    loadingSearch, 
    hasMoreSearchResults, 
    searchPage, 
    handleSearchChange, 
    handleSearchInputChange, 
    handleClearSearch, 
    searchCustomers
  ]);

  const pageTitle = 'Quotation Management';

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

      {/* Search Container */}
      <Box sx={{ mb: 2 }}>
        {/* Search Component */}
        {SearchComponent}
        
        {/* Selected Customer Indicator */}
        {selectedCustomer && (
          <Box sx={{ 
            mt: 1, 
            p: 1, 
            bgcolor: '#e3f2fd', 
            borderRadius: 1, 
            border: '1px solid #2196f3',
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography variant="body2" color="primary">
              <strong>Filtering by:</strong> {selectedCustomer.customerName}
              {selectedCustomer.companyName && ` (${selectedCustomer.companyName})`}
            </Typography>
            <IconButton
              size="small"
              onClick={handleClearSearch}
              sx={{ 
                color: '#2196f3',
                '&:hover': {
                  backgroundColor: 'rgba(33, 150, 243, 0.1)'
                }
              }}
            >
              <Clear fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

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
        onExport={handleExport}
        exportingQuotationId={exportingQuotationId}
        onViewPdf={canRead ? handleViewPdf : null}
        loadingPdfPreview={loadingPdfPreview}
        viewingPdfQuotationId={viewingPdfQuotationId}
        onSendEmail={canRead ? handleOpenEmailDialog : null}
        onCreate={canCreate ? handleCreate : null}
        onRefresh={canRead ? handleRefresh : null}
        
        // Row interaction
        onRowClick={canRead ? handleRowClick : null}
        
        // Configuration
        pageSizeOptions={[5, 10, 25, 50]}
        showToolbar={true}
      />

      {/* Dynamic Modal for Quotation CRUD */}
      <DynamicModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        title={`${modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Edit' : 'View'} Quotation`}
        initialData={selectedQuotation || {}}
        fields={getQuotationFields(modalMode === 'view', currentModalCustomer)}
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
            Are you sure you want to delete quotation <strong>#{quotationToDelete?.id}</strong>?
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
            PDF Preview - Quotation #{pdfPreviewData?.quotation?.id}
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
                title={`Quotation ${pdfPreviewData.quotation?.id} Preview`}
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

      {/* Email Dialog */}
      <Dialog
        open={emailDialogOpen}
        onClose={handleCloseEmailDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            fontWeight: 'bold',
            borderRadius: '12px 12px 0 0',
            pb: 3,
            pt: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.2)', 
              p: 1.5, 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Email sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Send Quotation via Email
              </Typography>
              {quotationToEmail && (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Quotation #{quotationToEmail.id} - {quotationToEmail.title}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Recipient Email */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#2c3e50' }}>
                Recipient Email Address *
              </Typography>
              <TextField
                type="email"
                fullWidth
                required
                value={emailFormData.recipientEmail}
                onChange={(e) => setEmailFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                placeholder="customer@example.com"
                disabled={sendingEmail}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Message */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#2c3e50' }}>
                Your Message *
              </Typography>
              <TextField
                multiline
                rows={8}
                fullWidth
                required
                value={emailFormData.message}
                onChange={(e) => setEmailFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter your message here..."
                disabled={sendingEmail}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />
            </Box>

            {/* Info Box */}
            <Box sx={{ 
              p: 2.5, 
              background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
              borderRadius: '12px', 
              border: '1px solid #667eea40'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ 
                  bgcolor: '#667eea', 
                  color: 'white',
                  p: 0.8, 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  mt: 0.3
                }}>
                  <FileDownload sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50', mb: 1 }}>
                    📎 What will be sent:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#5a6c7d', mb: 0.5 }}>
                    ✓ Your custom message above
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#5a6c7d', mb: 0.5 }}>
                    ✓ Complete quotation PDF with materials and pricing
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#5a6c7d' }}>
                    ✓ Professional formatting and company details
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, gap: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: '#f8f9fa' }}>
          <Button 
            onClick={handleCloseEmailDialog}
            variant="outlined"
            sx={{ 
              borderRadius: '8px',
              px: 3,
              py: 1,
              color: '#666',
              borderColor: '#ddd',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              }
            }}
            disabled={sendingEmail}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendEmail}
            variant="contained"
            startIcon={sendingEmail ? <CircularProgress size={20} color="inherit" /> : <Email />}
            sx={{
              borderRadius: '8px',
              px: 4,
              py: 1,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #667eea80 0%, #764ba280 100%)',
                color: '#ffffff',
              }
            }}
            disabled={sendingEmail || !emailFormData.recipientEmail || !emailFormData.message}
          >
            {sendingEmail ? 'Sending Email...' : 'Send Email'}
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
