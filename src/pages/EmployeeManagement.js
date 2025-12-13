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
  Avatar,
  IconButton,
  Grid,
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
import { BASE_URL } from '../constants/Constants';
import { Search, Clear, CloudUpload, Person, PhotoCamera, Delete } from '@mui/icons-material';

const INITIAL_PAGE_SIZE = 10;

export default function EmployeeManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, token } = useAuth();
  
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

  // Banks data
  const [banks, setBanks] = React.useState([]);
  const [loadingBanks, setLoadingBanks] = React.useState(false);


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
    const salaryNum = parseFloat(salary);
    if (isNaN(salaryNum)) return 'Basic salary must be a valid number';
    if (salaryNum <= 0) return 'Basic salary must be greater than 0';
    // Maximum value for DECIMAL(10, 2) is 99,999,999.99
    if (salaryNum > 99999999.99) return 'Basic salary must be less than or equal to 99,999,999.99';
    return '';
  };

  const validateStatus = (status) => {
    if (!status) return 'Status is required';
    if (!['active', 'inactive'].includes(status)) return 'Invalid status';
    return '';
  };

  const validateCnic = (cnic) => {
    if (cnic && cnic.length > 15) return 'CNIC must be 15 characters or less';
    return '';
  };

  const validateBankAccount = (bankAccount) => {
    if (bankAccount && bankAccount.length > 50) return 'Bank account number must be 50 characters or less';
    return '';
  };

  // Load banks for dropdown
  const loadBanks = React.useCallback(async () => {
    setLoadingBanks(true);
    try {
      const bankData = await get('/api/banks/all');
      
      // Handle different response structures
      let banksArray = [];
      if (Array.isArray(bankData)) {
        banksArray = bankData;
      } else if (bankData && bankData.success && Array.isArray(bankData.banks)) {
        // API returns: { success: true, banks: [...] }
        banksArray = bankData.banks;
      } else if (bankData && Array.isArray(bankData.data)) {
        banksArray = bankData.data;
      } else if (bankData && Array.isArray(bankData.banks)) {
        banksArray = bankData.banks;
      }
      
      setBanks(banksArray);
    } catch (error) {
      toast.error('Failed to load banks', {
        position: "top-right",
        autoClose: 3000,
      });
      setBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  }, [get]);

  // Load banks when modal opens
  React.useEffect(() => {
    if (modalOpen && (modalMode === 'create' || modalMode === 'edit')) {
      if (user && token) {
        loadBanks();
      }
    }
  }, [modalOpen, modalMode, loadBanks, user, token]);

  // Custom Picture Upload Component
  const PictureUploadComponent = ({ value, onChange, isViewMode }) => {
    const [preview, setPreview] = React.useState(null);
    const [imageError, setImageError] = React.useState(false);
    const fileInputRef = React.useRef(null);

    // Helper function to construct image URL
    const constructImageUrl = React.useCallback((val) => {
      if (!val || typeof val !== 'string' || val.trim() === '') {
        return null;
      }
      
      let imageUrl = val.trim();
      if (imageUrl.startsWith('/uploads/')) {
        // Relative path - construct full URL using BASE_URL
        imageUrl = `${BASE_URL}${imageUrl}`;
      } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
        // Assume it's a relative path without leading slash
        imageUrl = `${BASE_URL}/${imageUrl}`;
      }
      return imageUrl;
    }, []);

    // Initialize preview from value
    React.useEffect(() => {
      setImageError(false); // Reset error state when value changes
      
      if (value) {
        if (typeof value === 'string' && value.trim() !== '') {
          // Existing picture URL from database
          const imageUrl = constructImageUrl(value);
          if (imageUrl) {
            setPreview(imageUrl);
          } else {
            setPreview(null);
          }
        } else if (value instanceof File) {
          // New file selected
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(reader.result);
          };
          reader.onerror = () => {
            setPreview(null);
            setImageError(true);
          };
          reader.readAsDataURL(value);
        } else {
          setPreview(null);
        }
      } else {
        setPreview(null);
      }
    }, [value, constructImageUrl]);

    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error('Please select an image file', {
            position: "top-right",
            autoClose: 3000,
          });
          return;
        }
        
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image size must be less than 5MB', {
            position: "top-right",
            autoClose: 3000,
          });
          return;
        }

        onChange(file);
      }
    };

    const handleClick = () => {
      if (!isViewMode && fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleRemove = (e) => {
      e.stopPropagation();
      if (!isViewMode) {
        onChange(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };


    return (
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
          Employee Picture
        </Typography>
        
        <Box
          onClick={handleClick}
          sx={{
            position: 'relative',
            width: '200px',
            height: '200px',
            margin: '0 auto',
            border: preview && !imageError ? 'none' : '3px dashed #1976d2',
            borderRadius: '12px',
            background: preview && !imageError
              ? 'transparent'
              : 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isViewMode ? 'default' : 'pointer',
            transition: 'all 0.3s ease',
            overflow: 'hidden',
            boxShadow: preview && !imageError ? '0 8px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.1)',
            '&:hover': !isViewMode && {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
              borderColor: '#1565c0',
            }
          }}
        >
          {preview ? (
            <>
              {imageError ? (
                // Show placeholder if image failed to load
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f5f5f5',
                    borderRadius: '12px',
                  }}
                >
                  <PhotoCamera sx={{ fontSize: 48, color: '#999', mb: 1 }} />
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    Image unavailable
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999', fontSize: '10px', mt: 0.5 }}>
                    {preview.substring(preview.lastIndexOf('/') + 1)}
                  </Typography>
                </Box>
              ) : (
                <>
                  <img
                    src={preview}
                    alt="Employee"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '12px',
                    }}
                    onLoad={() => {
                      setImageError(false);
                    }}
                    onError={(e) => {
                      // Don't clear preview on error - keep the URL so user can see it
                      // The error might be CORS or network related, but URL is valid
                      setImageError(true);
                      // Don't setPreview(null) - keep the URL
                    }}
                  />
                  {!isViewMode && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        borderRadius: '12px',
                        '&:hover': {
                          opacity: 1,
                        }
                      }}
                    >
                      <PhotoCamera sx={{ fontSize: 48, color: 'white' }} />
                    </Box>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: '#1976d2',
                  mb: 2
                }}
              >
                <Person sx={{ fontSize: 48 }} />
              </Avatar>
              {!isViewMode && (
                <>
                  <CloudUpload sx={{ fontSize: 32, color: '#1976d2', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>
                    Click to upload picture
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999', mt: 0.5 }}>
                    JPG, PNG, GIF, WEBP (Max 5MB)
                  </Typography>
                </>
              )}
              {isViewMode && (
                <Typography variant="body2" sx={{ color: '#999', mt: 2 }}>
                  No picture available
                </Typography>
              )}
            </>
          )}
        </Box>

        {preview && !isViewMode && (
          <Button
            onClick={handleRemove}
            startIcon={<Delete />}
            size="small"
            color="error"
            sx={{ mt: 2 }}
          >
            Remove Picture
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {!isViewMode && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#666' }}>
            {preview ? 'Click on image to change' : 'Upload employee profile picture'}
          </Typography>
        )}
      </Box>
    );
  };

  // CNIC Image Upload Component (reusing PictureUploadComponent logic)
  const CnicImageUploadComponent = ({ value, onChange, isViewMode }) => {
    const [preview, setPreview] = React.useState(null);
    const [imageError, setImageError] = React.useState(false);
    const fileInputRef = React.useRef(null);

    // Helper function to construct image URL
    const constructImageUrl = React.useCallback((val) => {
      if (!val || typeof val !== 'string' || val.trim() === '') {
        return null;
      }
      
      let imageUrl = val.trim();
      if (imageUrl.startsWith('/uploads/')) {
        imageUrl = `${BASE_URL}${imageUrl}`;
      } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
        imageUrl = `${BASE_URL}/${imageUrl}`;
      }
      return imageUrl;
    }, []);

    // Initialize preview from value
    React.useEffect(() => {
      setImageError(false);
      
      if (value) {
        if (typeof value === 'string' && value.trim() !== '') {
          const imageUrl = constructImageUrl(value);
          if (imageUrl) {
            setPreview(imageUrl);
          } else {
            setPreview(null);
          }
        } else if (value instanceof File) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(reader.result);
          };
          reader.onerror = () => {
            setPreview(null);
            setImageError(true);
          };
          reader.readAsDataURL(value);
        } else {
          setPreview(null);
        }
      } else {
        setPreview(null);
      }
    }, [value, constructImageUrl]);

    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          toast.error('Please select an image file', {
            position: "top-right",
            autoClose: 3000,
          });
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image size must be less than 5MB', {
            position: "top-right",
            autoClose: 3000,
          });
          return;
        }

        onChange(file);
      }
    };

    const handleClick = () => {
      if (!isViewMode && fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleRemove = (e) => {
      e.stopPropagation();
      if (!isViewMode) {
        onChange(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    return (
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#2e7d32' }}>
          CNIC Image
        </Typography>
        
        <Box
          onClick={handleClick}
          sx={{
            position: 'relative',
            width: '200px',
            height: '200px',
            margin: '0 auto',
            border: preview && !imageError ? 'none' : '3px dashed #2e7d32',
            borderRadius: '12px',
            background: preview && !imageError
              ? 'transparent'
              : 'linear-gradient(135deg, #c8e6c915 0%, #a5d6a715 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isViewMode ? 'default' : 'pointer',
            transition: 'all 0.3s ease',
            overflow: 'hidden',
            boxShadow: preview && !imageError ? '0 8px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.1)',
            '&:hover': !isViewMode && {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
              borderColor: '#1b5e20',
            }
          }}
        >
          {preview ? (
            <>
              {imageError ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f5f5f5',
                    borderRadius: '12px',
                  }}
                >
                  <PhotoCamera sx={{ fontSize: 48, color: '#999', mb: 1 }} />
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    Image unavailable
                  </Typography>
                </Box>
              ) : (
                <>
                  <img
                    src={preview}
                    alt="CNIC"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '12px',
                    }}
                    onLoad={() => {
                      setImageError(false);
                    }}
                    onError={(e) => {
                      setImageError(true);
                    }}
                  />
                  {!isViewMode && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        borderRadius: '12px',
                        '&:hover': {
                          opacity: 1,
                        }
                      }}
                    >
                      <PhotoCamera sx={{ fontSize: 48, color: 'white' }} />
                    </Box>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: '#2e7d32',
                  mb: 2
                }}
              >
                <Person sx={{ fontSize: 48 }} />
              </Avatar>
              {!isViewMode && (
                <>
                  <CloudUpload sx={{ fontSize: 32, color: '#2e7d32', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold' }}>
                    Click to upload CNIC
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999', mt: 0.5 }}>
                    JPG, PNG, GIF, WEBP (Max 5MB)
                  </Typography>
                </>
              )}
              {isViewMode && (
                <Typography variant="body2" sx={{ color: '#999', mt: 2 }}>
                  No CNIC image available
                </Typography>
              )}
            </>
          )}
        </Box>

        {preview && !isViewMode && (
          <Button
            onClick={handleRemove}
            startIcon={<Delete />}
            size="small"
            color="error"
            sx={{ mt: 2 }}
          >
            Remove CNIC Image
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {!isViewMode && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#666' }}>
            {preview ? 'Click on image to change' : 'Upload employee CNIC image'}
          </Typography>
        )}
      </Box>
    );
  };

  // Ref to store cnic_image onChange callback (outside function so it persists)
  const cnicImageOnChangeRef = React.useRef(null);

  // Define employee form fields
  const getEmployeeFields = (isViewMode = false) => {
    return [
    {
      name: 'picture',
      label: 'Employee Images',
      type: 'custom',
      required: false,
      render: (value, onChange, isView, formData) => {
        const pictureValue = value || formData?.picture || selectedEmployee?.picture || null;
        const cnicImageValue = formData?.cnic_image || selectedEmployee?.cnic_image || null;
        
        const handlePictureChange = (file) => {
          onChange(file);
        };
        
        const handleCnicImageChange = (file) => {
          // Update formData directly for cnic_image
          if (formData) {
            formData.cnic_image = file;
          }
          // Also call the cnic_image onChange if available
          if (cnicImageOnChangeRef.current) {
            cnicImageOnChangeRef.current(file);
          }
          // Trigger a re-render by updating picture field (even with same value)
          onChange(pictureValue);
        };
        
        return (
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <CnicImageUploadComponent 
                  key={`cnic-image-${selectedEmployee?.id || 'new'}-${modalMode}`}
                  value={cnicImageValue} 
                  onChange={handleCnicImageChange} 
                  isViewMode={isView}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <PictureUploadComponent 
                  key={`picture-${selectedEmployee?.id || 'new'}-${modalMode}`}
                  value={pictureValue} 
                  onChange={handlePictureChange} 
                  isViewMode={isView}
                />
              </Grid>
            </Grid>
          </Box>
        );
      },
    },
    {
      name: 'cnic_image',
      label: 'CNIC Image',
      type: 'custom',
      required: false,
      render: (value, onChange, isView, formData) => {
        // Store the onChange callback in ref so picture field can use it
        cnicImageOnChangeRef.current = onChange;
        // Don't render anything - handled in picture field above
        return null;
      },
    },
    {
      name: 'name',
      label: 'Employee Name',
      type: 'text',
      required: true,
      validate: validateName,
      tooltip: 'Full name of the employee'
    },
    {
      name: 'cnic',
      label: 'CNIC',
      type: 'text',
      required: false,
      validate: validateCnic,
      tooltip: 'Employee CNIC number (e.g., 12345-1234567-1)',
      placeholder: 'XXXXX-XXXXXXX-X'
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
            key={`date-${selectedEmployee?.id || 'new'}-${modalMode}`}
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
      tooltip: 'Monthly basic salary (Maximum: 99,999,999.99)',
      InputProps: {
        startAdornment: <InputAdornment position="start">PKR</InputAdornment>
      },
      inputProps: {
        max: 99999999.99,
        step: 0.01,
        min: 0
      }
    },
    {
      name: 'bank_id',
      label: 'Bank Name',
      type: 'custom',
      required: false,
      tooltip: 'Select bank for salary transfer',
      render: (value, onChange, isViewMode) => (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Bank Name
          </Typography>
          
          {!isViewMode ? (
            <FormControl fullWidth size="small">
              <InputLabel>Select Bank</InputLabel>
              <Select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                label="Select Bank"
                disabled={loadingBanks}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {banks && banks.length > 0 ? (
                  banks.map((bank) => (
                    <MenuItem key={bank.id} value={bank.id}>
                      {bank.bank_name}
                    </MenuItem>
                  ))
                ) : (
                  !loadingBanks && (
                    <MenuItem disabled>
                      No banks available
                    </MenuItem>
                  )
                )}
              </Select>
              {loadingBanks && (
                <Typography variant="caption" sx={{ mt: 0.5, color: '#666' }}>
                  Loading banks...
                </Typography>
              )}
              {!loadingBanks && banks.length === 0 && (
                <Typography variant="caption" sx={{ mt: 0.5, color: '#d32f2f' }}>
                  No banks found. Please add banks first.
                </Typography>
              )}
            </FormControl>
          ) : (
            <TextField
              label="Bank Name"
              value={
                selectedEmployee?.bank?.bank_name || 'Not specified'
              }
              disabled
              fullWidth
              size="small"
            />
          )}
        </Box>
      ),
    },
    {
      name: 'bank_account_number',
      label: 'Bank Account Number',
      type: 'text',
      required: false,
      validate: validateBankAccount,
      tooltip: 'Employee bank account number for salary transfer'
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
  };

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
      cnic: '',
      bank_id: '',
      bank_account_number: '',
      picture: null,
      cnic_image: null,
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
      // Create FormData for file upload
      const submitFormData = new FormData();
      submitFormData.append('name', formData.name);
      submitFormData.append('designation', formData.designation || '');
      submitFormData.append('joining_date', formData.joining_date || '');
      submitFormData.append('basic_salary', parseFloat(formData.basic_salary));
      submitFormData.append('status', formData.status);
      submitFormData.append('cnic', formData.cnic || '');
      submitFormData.append('bank_account_number', formData.bank_account_number || '');
      submitFormData.append('bank_id', formData.bank_id || '');
      
      // Handle picture file if present
      if (formData.picture && formData.picture instanceof File) {
        submitFormData.append('picture', formData.picture);
      }
      
      // Handle CNIC image file if present
      if (formData.cnic_image && formData.cnic_image instanceof File) {
        submitFormData.append('cnic_image', formData.cnic_image);
      }

      let response;
      
      if (modalMode === 'create') {
        response = await post('/api/employees', submitFormData);
      } else {
        response = await put(`/api/employees/${selectedEmployee.id}`, submitFormData);
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
        field: 'cnic',
        headerName: 'CNIC',
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
      // {
      //   field: 'bank',
      //   headerName: 'Bank Name',
      //   width: 180,
      //   align: 'left',
      //   headerAlign: 'left',
      //   valueGetter: (value, row) => {
      //     return row?.bank?.bank_name || 'N/A';
      //   },
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
      //       {params.row?.bank?.bank_name || 'N/A'}
      //     </Typography>
      //   ),
      // },
      // {
      //   field: 'bank_account_number',
      //   headerName: 'Bank Account',
      //   width: 150,
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
      //       {params.value || 'N/A'}
      //     </Typography>
      //   ),
      // },
      // {
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
        initialData={selectedEmployee ? { ...selectedEmployee } : {}}
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
