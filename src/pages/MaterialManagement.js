import * as React from 'react';
import {
  Alert,
  Box,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
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

const INITIAL_PAGE_SIZE = 10;

export default function MaterialManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, hasPermission, token } = useAuth();
  
  // Check user permissions
  const canRead = user?.permissions?.material?.includes('read') || false;
  const canCreate = user?.permissions?.material?.includes('create') || false;
  const canUpdate = user?.permissions?.material?.includes('update') || false;
  const canDelete = user?.permissions?.material?.includes('delete') || false;

  const { get, post, put, del } = useApi(); // Use the useApi hook

  const [rowsState, setRowsState] = React.useState({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState('view');
  const [selectedMaterial, setSelectedMaterial] = React.useState(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [materialToDelete, setMaterialToDelete] = React.useState(null);

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
    if (!name) return 'Material name is required';
    if (name.length < 2) return 'Material name must be at least 2 characters';
    return '';
  };

  const validateMaterialType = (type) => {
    if (!type) return 'Material type is required';
    if (!['material', 'service'].includes(type)) return 'Invalid material type';
    return '';
  };

  const validateUnitPrice = (price) => {
    if (price === undefined || price === null || price === '') return 'Unit price is required';
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) return 'Unit price must be a valid positive number';
    return '';
  };

  // Define material form fields
  const getMaterialFields = (isViewMode = false) => [
    {
      name: 'name',
      label: 'Material Name',
      type: 'text',
      required: true,
      readOnly: isViewMode,
      validate: validateName,
      tooltip: 'Must be at least 2 characters',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      multiline: true,
      rows: 3,
      readOnly: isViewMode,
      tooltip: 'Optional description of the material'
    },
    {
      name: 'materialType',
      label: 'Type',
      type: 'select',
      required: true,
      readOnly: isViewMode,
      validate: validateMaterialType,
      tooltip: 'Select material or service',
      options: [
        { value: 'material', label: 'Material' },
        { value: 'service', label: 'Service' }
      ]
    },
    {
      name: 'unitPrice',
      label: 'Unit Price',
      type: 'number',
      required: true,
      readOnly: isViewMode,
      validate: validateUnitPrice,
      tooltip: 'Price per unit',
      inputProps: { min: 0, step: 0.01 }
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

  // API call to fetch materials with pagination
  const loadMaterials = React.useCallback(async () => {
    if (!canRead) return; // Don't load data if user doesn't have read permission
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      
      const apiUrl = `/api/materials?page=${page}&size=${pageSize}`;
      
      const materialData = await get(apiUrl);
      
      // Handle the response structure based on your API
      if (materialData.materials && Array.isArray(materialData.materials)) {
        setRowsState({
          rows: materialData.materials,
          rowCount: materialData.totalCount || materialData.materials.length,
        });
      } else if (Array.isArray(materialData)) {
        // Fallback for direct array response
        setRowsState({
          rows: materialData,
          rowCount: materialData.length,
        });
      } else {
        setRowsState({
          rows: [],
          rowCount: 0,
        });
      }
      
    } catch (loadError) {
      setError(loadError.message || 'Failed to load materials');
      toast.error('Failed to load materials', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.error('Error loading materials:', loadError);
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead]);

  // Load data when component mounts or pagination changes
  React.useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Action handlers - updated to use modal
  const handleView = React.useCallback((materialData) => {
    if (!canRead) return;
    setSelectedMaterial(materialData);
    setModalMode('view');
    setModalOpen(true);
  }, [canRead]);

  const handleEdit = React.useCallback((materialData) => {
    if (!canUpdate) return;
    setSelectedMaterial(materialData);
    setModalMode('edit');
    setModalOpen(true);
  }, [canUpdate]);

  const handleDelete = React.useCallback((materialData) => {
    if (!canDelete) return;
    setMaterialToDelete(materialData);
    setDeleteDialogOpen(true);
  }, [canDelete]);

  // Confirm delete function
  const confirmDelete = async () => {
    if (!materialToDelete) return;
    
    setIsLoading(true);
    setDeleteDialogOpen(false);
    
    try {
      await del(`/api/materials/${materialToDelete.id}`);

      toast.success(`Material "${materialToDelete.name}" deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      loadMaterials();
    } catch (deleteError) {
      toast.error(`Failed to delete material: ${deleteError.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
      setMaterialToDelete(null);
    }
  };

  // Cancel delete function
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setMaterialToDelete(null);
  };

  const handleCreate = React.useCallback(() => {
    if (!canCreate) return;
    setSelectedMaterial({ materialType: 'material', unitPrice: 0 }); // Default values
    setModalMode('create');
    setModalOpen(true);
  }, [canCreate]);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading && canRead) {
      loadMaterials();
    }
  }, [isLoading, loadMaterials, canRead]);

  const handleRowClick = React.useCallback(
    ({ row }) => {
      handleView(row);
    },
    [handleView],
  );

  // Handle modal submit
  const handleModalSubmit = async (formData) => {
    // Don't submit in view mode
    if (modalMode === 'view') {
      setModalOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      // Prepare submit data according to API requirements
      const submitData = {
        name: formData.name,
        description: formData.description,
        materialType: formData.materialType,
        unitPrice: parseFloat(formData.unitPrice),
      };

      let response;
      
      if (modalMode === 'create') {
        response = await post('/api/materials', submitData);
      } else {
        response = await put(`/api/materials/${selectedMaterial.id}`, submitData);
      }

      const successMessage = modalMode === 'create' 
        ? 'Material created successfully!' 
        : 'Material updated successfully!';
      
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setModalOpen(false);
      loadMaterials();
    } catch (submitError) {
      let errorMessage = `Failed to ${modalMode} material`;
      
      if (submitError.response && submitError.response.data) {
        const serverError = submitError.response.data;
        
        // Check if the server returned a specific error message
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

  // Column definitions for materials
  const columns = React.useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Name',
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
        field: 'description',
        headerName: 'Description',
        width: 250,
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
            {params.value || 'No description'}
          </Typography>
        ),
      },
      {
        field: 'materialType',
        headerName: 'Type',
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
              label={params.value} 
              variant="outlined" 
              size="small"
              color={params.value === 'material' ? 'primary' : 'secondary'}
            />
          </Box>
        ),
      },
      {
        field: 'unitPrice',
        headerName: 'Unit Price',
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
            PKR {params.value ? parseFloat(params.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
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

  const pageTitle = 'Material Management';

  // If user doesn't have read permission, show error message
  if (!canRead) {
    return (
      <PageContainer title={pageTitle} breadcrumbs={[{ title: pageTitle }]}>
        <Alert severity="error" sx={{ mb: 2 }}>
          You do not have permission to view this page
        </Alert>
        
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

      {/* Dynamic Modal for Material CRUD */}
      <DynamicModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        title={`${modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Edit' : 'View'} Material`}
        initialData={selectedMaterial || {}}
        fields={getMaterialFields(modalMode === 'view')}
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
            Are you sure you want to delete the material <strong>"{materialToDelete?.name}"</strong>?
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
