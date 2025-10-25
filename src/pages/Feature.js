import * as React from 'react';
import {
  Alert,
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import ReusableDataTable from '../components/ReusableData';
import PageContainer from '../components/PageContainer';
import DynamicModal from '../components/DynamicModel';
import { BASE_URL } from "../constants/Constants";

const INITIAL_PAGE_SIZE = 10;

export default function FeatureManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, hasPermission, token } = useAuth();
  const [rowsState, setRowsState] = React.useState({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState('view');
  const [selectedFeature, setSelectedFeature] = React.useState(null);

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

  // Define feature form fields
  const featureFields = [
    {
      name: 'name',
      label: 'Feature Name',
      type: 'text',
      required: true,
      maxLength: 50,
    },
    {
      name: 'displayName',
      label: 'Display Name',
      type: 'text',
      required: true,
      maxLength: 100,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      multiline: true,
      rows: 3,
      maxLength: 1000,
    },
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

  // API call to fetch features
  const loadFeatures = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      
      // Build API URL with pagination parameters
      const apiUrl = `${BASE_URL}/api/tabs?page=${page}&size=${pageSize}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      if (responseData.success) {
        const featuresData = responseData.data.content || responseData.data;
        
        setRowsState({
          rows: Array.isArray(featuresData) ? featuresData : [],
          rowCount: responseData.data.totalElements || featuresData.length,
        });
      } else {
        throw new Error(responseData.message || 'Failed to load features');
      }
      
    } catch (loadError) {
      setError(loadError.message || 'Failed to load features');
      console.error('Error loading features:', loadError);
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, token]);

  // Load data when component mounts or pagination changes
  React.useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  // Action handlers
  const handleView = React.useCallback((featureData) => {
    setSelectedFeature(featureData);
    setModalMode('view');
    setModalOpen(true);
  }, []);

  const handleEdit = React.useCallback((featureData) => {
    setSelectedFeature(featureData);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleDelete = React.useCallback(
    async (featureData) => {
      const confirmed = window.confirm(
        `Do you wish to delete feature "${featureData.name}"?`
      );

      if (confirmed) {
        setIsLoading(true);
        try {
          const response = await fetch(`${BASE_URL}/api/tabs/${featureData.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          
          if (result.success) {
            alert('Feature deleted successfully!');
            loadFeatures();
          } else {
            throw new Error(result.message || 'Failed to delete feature');
          }
        } catch (deleteError) {
          alert(`Failed to delete feature: ${deleteError.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [loadFeatures, token],
  );

  const handleCreate = React.useCallback(() => {
    setSelectedFeature({});
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading) {
      loadFeatures();
    }
  }, [isLoading, loadFeatures]);

  const handleRowClick = React.useCallback(
    ({ row }) => {
      handleView(row);
    },
    [handleView],
  );

  // Handle modal submit
  const handleModalSubmit = async (formData) => {
    setIsLoading(true);
    try {
      const url = modalMode === 'create' 
        ? `${BASE_URL}/api/tabs` 
        : `${BASE_URL}/api/tabs/${selectedFeature.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const requestBody = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description || '',
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        alert(`Feature ${modalMode === 'create' ? 'created' : 'updated'} successfully!`);
        setModalOpen(false);
        loadFeatures();
      } else {
        throw new Error(result.message || `Failed to ${modalMode} feature`);
      }
    } catch (submitError) {
      alert(`Failed to ${modalMode} feature: ${submitError.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Column definitions for features
  const columns = React.useMemo(
    () => [
      { 
        field: 'id', 
        headerName: 'ID',
        width: 70,
      },
      {
        field: 'name',
        headerName: 'Feature Name',
        width: 140,
      },
      {
        field: 'displayName',
        headerName: 'Display Name',
        width: 160,
      },
      {
        field: 'description',
        headerName: 'Description',
        width: 220,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ 
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {params.value || 'No description'}
          </Typography>
        ),
      },
      {
        field: 'createdAt',
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
    ],
    [],
  );

  const pageTitle = 'Feature Management';

  return (
    <PageContainer
      title={pageTitle}
      breadcrumbs={[{ title: pageTitle }]}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
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
        filterMode="server"
        
        // Actions
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onRefresh={handleRefresh}
        
        // Row interaction
        onRowClick={handleRowClick}
        
        // Configuration
        pageSizeOptions={[5, 10, 25, 50]}
        showToolbar={true}
      />

      {/* Dynamic Modal */}
      <DynamicModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        title={`${modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Edit' : 'View'} Feature`}
        initialData={selectedFeature || {}}
        fields={featureFields}
        onSubmit={handleModalSubmit}
        loading={isLoading}
        readOnly={modalMode === 'view'}
      />
    </PageContainer>
  );
}