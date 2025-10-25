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

export default function UserManagement() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { user, hasPermission, token } = useAuth();
  
  // Check user permissions
  const canRead = user?.permissions?.user?.includes('read') || false;
  const canCreate = user?.permissions?.user?.includes('create') || false;
  const canUpdate = user?.permissions?.user?.includes('update') || false;
  const canDelete = user?.permissions?.user?.includes('delete') || false;

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
  const [selectedUser, setSelectedUser] = React.useState(null);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = React.useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState(null);

  // Roles state (fetched from API)
  const [roles, setRoles] = React.useState([]);
  const [loadingRoles, setLoadingRoles] = React.useState(false);
  const [rolesError, setRolesError] = React.useState(null);

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
      // Optionally redirect to unauthorized page
      // navigate('/unauthorized');
    }
  }, [canRead, navigate]);

  // Validation functions
  const validateUsername = (username) => {
    if (!username) return 'Username is required';
    if (username.length < 5) return 'Username must be at least 5 characters';
    if (!/^[a-zA-Z]/.test(username)) return 'Username must start with an alphabet';
    if (!/^[a-zA-Z0-9]+$/.test(username)) return 'Username can only contain letters and numbers';
    return '';
  };

  const validateEmail = (email) => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 5) return 'Password must be at least 5 characters';
    return '';
  };

  const validateRole = (roleId) => {
    if (!roleId) return 'Role is required';
    return '';
  };

  // Update your getUserFields function to use a different field name for view mode
  const getUserFields = (isCreate = false, includePassword = false, isViewMode = false) => [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      readOnly: isViewMode,
      validate: validateUsername,
      tooltip: 'Must be at least 5 characters and start with a letter',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      readOnly: isViewMode,
      validate: validateEmail,
      tooltip: 'Must be a valid email address'
    },
    ...(isCreate ? [{
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      validate: validatePassword,
      tooltip: 'Must be at least 5 characters'
    }] : []),
    ...(includePassword && !isCreate ? [
      {
        name: 'password',
        label: 'New Password',
        type: 'password',
        required: true,
        placeholder: 'Enter new password',
        validate: validatePassword,
        tooltip: 'Must be at least 5 characters'
      },
      {
        name: 'confirmPassword',
        label: 'Confirm New Password',
        type: 'password',
        required: true,
        placeholder: 'Confirm new password',
        validate: (value, formData) => {
          if (value !== formData.password) return 'Passwords do not match';
          return '';
        },
        tooltip: 'Must match the password above'
      }
    ] : []),
    // For view mode, use a different field name to display roleName
    isViewMode ? {
      name: 'roleName', // Use roleName field instead of roleId
      label: 'Role',
      type: 'text',
      readOnly: true,
    } : {
      name: 'roleId',
      label: 'Role',
      type: 'select',
      required: true,
      validate: validateRole,
      tooltip: 'Please select a role',
      options: roles.map(role => ({
        value: role.id,
        label: role.name
      })),
      loading: loadingRoles,
      error: rolesError,
    },
    {
      name: 'isActive',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
      readOnly: isViewMode,
    },
  ];

  // API call to fetch roles
  const fetchRoles = React.useCallback(async () => {
    setLoadingRoles(true);
    setRolesError(null);
    
    try {
       const data = await get('/api/roles/ids-and-names');
      
      if (Array.isArray(data)) {
        setRoles(data);
      } else {
        throw new Error('Invalid roles data format');
      }
    } catch (error) {
      setRolesError(error.message || 'Failed to load roles');
      toast.error('Failed to load roles', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.error('Error loading roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  }, [get]);

  // Load roles when modal opens for create/edit modes only
  React.useEffect(() => {
    if (modalOpen && (modalMode === 'create' || modalMode === 'edit')) {
      fetchRoles();
    }
  }, [modalOpen, modalMode, fetchRoles]);

  // Reset password change state when modal closes
  React.useEffect(() => {
    if (!modalOpen) {
      setShowPasswordChange(false);
    }
  }, [modalOpen]);

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

  // API call to fetch users with pagination
  const loadUsers = React.useCallback(async () => {
    if (!canRead) return; // Don't load data if user doesn't have read permission
    
    setError(null);
    setIsLoading(true);

    try {
      const { page, pageSize } = paginationModel;
      
      const apiUrl = `/api/users?page=${page}&size=${pageSize}`;
      
      const userData = await get(apiUrl);
      
      // Handle the response structure based on your API
      if (userData.users && Array.isArray(userData.users)) {
        setRowsState({
          rows: userData.users,
          rowCount: userData.totalCount || userData.users.length,
        });
      } else if (Array.isArray(userData)) {
        // Fallback for direct array response
        setRowsState({
          rows: userData,
          rowCount: userData.length,
        });
      } else {
        setRowsState({
          rows: [],
          rowCount: 0,
        });
      }
      
    } catch (loadError) {
      setError(loadError.message || 'Failed to load users');
      toast.error('Failed to load users', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      console.error('Error loading users:', loadError);
    } finally {
      setIsLoading(false);
    }
  }, [paginationModel, get, canRead]);

  // Load data when component mounts or pagination changes
  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Action handlers - updated to use modal
  const handleView = React.useCallback((userData) => {
    if (!canRead) return;
    setSelectedUser(userData);
    setModalMode('view');
    setShowPasswordChange(false);
    setModalOpen(true);
  }, [canRead]);

  const handleEdit = React.useCallback((userData) => {
    if (!canUpdate) return;
    setSelectedUser(userData);
    setModalMode('edit');
    setShowPasswordChange(false);
    setModalOpen(true);
  }, [canUpdate]);

  const handleDelete = React.useCallback((userData) => {
    if (!canDelete) return;
    setUserToDelete(userData);
    setDeleteDialogOpen(true);
  }, [canDelete]);

  // Confirm delete function
  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    setIsLoading(true);
    setDeleteDialogOpen(false);
    
    try {
      const response = await fetch(`${BASE_URL}/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const responseData = await response.json(); // Parse the response

      if (!response.ok) {
        // Check if there's a specific error message from the server
        const errorMessage = responseData.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      toast.success(`User "${userToDelete.username}" deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      loadUsers();
    } catch (deleteError) {
      toast.error(`Failed to delete user: ${deleteError.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
      setUserToDelete(null);
    }
  };
  // Cancel delete function
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleCreate = React.useCallback(() => {
    if (!canCreate) return;
    setSelectedUser({ isActive: true }); // Default active to true for new users
    setModalMode('create');
    setShowPasswordChange(false);
    setModalOpen(true);
  }, [canCreate]);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading && canRead) {
      loadUsers();
    }
  }, [isLoading, loadUsers, canRead]);

  const handleRowClick = React.useCallback(
    ({ row }) => {
      handleView(row);
    },
    [handleView],
  );

  // Handle modal submit
  const handleModalSubmit = async (formData) => {
    // Validate password confirmation if password change is enabled
    if (showPasswordChange && modalMode === 'edit') {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match!', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }
      
      if (!formData.password || formData.password.trim().length < 5) {
        toast.error('Password must be at least 5 characters long!', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }
    }

    // Don't submit in view mode
    if (modalMode === 'view') {
      setModalOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      // Prepare submit data according to API requirements
      const submitData = {
        username: formData.username,
        email: formData.email,
        roleId: parseInt(formData.roleId),
        isActive: formData.isActive !== undefined ? formData.isActive : true,
      };

      // Add password for create mode or edit mode with password change
      if (modalMode === 'create' || (modalMode === 'edit' && showPasswordChange)) {
        submitData.password = formData.password;
      }

      let response;
      
      if (modalMode === 'create') {
        response = await post('/api/users', submitData);
      } else {
        response = await put(`/api/users/${selectedUser.id}`, submitData);
      }

      const successMessage = modalMode === 'create' 
        ? 'User created successfully!' 
        : showPasswordChange 
          ? 'User updated and password changed successfully!'
          : 'User updated successfully!';
      
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setModalOpen(false);
      setShowPasswordChange(false);
      loadUsers();
    } catch (submitError) {
      console.log("error ", submitError);

      // toast.error(`Failed to ${modalMode} user: ${submitError.message}`, {
      //   position: "top-right",
      //   autoClose: 5000,
      //   hideProgressBar: false,
      //   closeOnClick: true,
      //   pauseOnHover: true,
      //   draggable: true,
      // });
      let errorMessage = `Failed to ${modalMode} user`;
      
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

  // Column definitions for users
  const columns = React.useMemo(
    () => [
      { 
        field: 'id', 
        headerName: 'ID',
        width: 70,
      },
      {
        field: 'username',
        headerName: 'Username',
        width: 150,
      },
      {
        field: 'email',
        headerName: 'Email',
        width: 200,
      },
      {
        field: 'roleName',
        headerName: 'Role',
        width: 150,
        renderCell: (params) => (
          <Chip 
            label={params.value || 'No Role'} 
            variant="outlined" 
            size="small"
            color={params.value ? 'primary' : 'default'}
          />
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 100,
        renderCell: (params) => (
          <Chip 
            label={params.value ? 'Active' : 'Inactive'} 
            variant="filled" 
            size="small"
            color={params.value ? 'success' : 'error'}
          />
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

  const pageTitle = 'User Management';

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

      {/* Dynamic Modal for User CRUD */}
      <DynamicModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setShowPasswordChange(false);
        }}
        mode={modalMode}
        title={`${modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Edit' : 'View'} User`}
        initialData={selectedUser || {}}
        fields={getUserFields(
          modalMode === 'create', 
          showPasswordChange, 
          modalMode === 'view'
        )}
        onSubmit={handleModalSubmit}
        loading={isLoading}
        showPasswordChange={showPasswordChange}
        onTogglePasswordChange={() => setShowPasswordChange(!showPasswordChange)}
        isEditMode={modalMode === 'edit'}
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
            Are you sure you want to delete the user <strong>"{userToDelete?.username}"</strong>?
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