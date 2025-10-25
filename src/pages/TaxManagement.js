import * as React from 'react';
import {
  Alert,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Card,
  CardContent,
  Grid,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../auth/AuthContext';
import PageContainer from '../components/PageContainer';
import { useApi } from '../hooks/useApi';
import { Edit, Save, Cancel } from '@mui/icons-material';

export default function TaxManagement() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  
  const { user, hasPermission, token } = useAuth();
  
  // Check user permissions
  const canRead = user?.permissions?.tax?.includes('read') || false;
  const canUpdate = user?.permissions?.tax?.includes('update') || false;
  
  
  // State management
  const [taxes, setTaxes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingTax, setEditingTax] = React.useState(null);
  const [taxPercent, setTaxPercent] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [taxPercentError, setTaxPercentError] = React.useState('');

  // API hook
  const api = useApi();

  // Fetch taxes on component mount
  React.useEffect(() => {
    if (user && canRead) {
      fetchTaxes();
    }
  }, [user, canRead]);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/tax');
      
      if (response.success) {
        setTaxes(response.data);
      } else {
        toast.error('Failed to fetch tax records');
      }
    } catch (error) {
      console.error('Error fetching taxes:', error);
      toast.error('Error fetching tax records');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (tax) => {
    setEditingTax(tax);
    setTaxPercent(tax.tax_percent.toString());
    setTaxPercentError('');
    setEditDialogOpen(true);
  };

  const handleTaxPercentChange = (e) => {
    const value = e.target.value;
    setTaxPercent(value);
    
    // Real-time validation
    if (value === '') {
      setTaxPercentError('');
    } else if (isNaN(value)) {
      setTaxPercentError('Please enter a valid number');
    } else if (parseFloat(value) < 1) {
      setTaxPercentError('Tax percentage must be at least 1%');
    } else if (parseFloat(value) > 98) {
      setTaxPercentError('Tax percentage cannot exceed 98%');
    } else {
      setTaxPercentError('');
    }
  };

  const handleSave = async () => {
    if (!taxPercent || isNaN(taxPercent) || taxPercent < 1 || taxPercent > 98) {
      toast.error('Please enter a valid tax percentage (1-98)');
      return;
    }

    try {
      setSaving(true);
      const response = await api.put(`/api/tax/${editingTax.id}`, {
        tax_percent: parseFloat(taxPercent)
      });

      if (response.success) {
        toast.success('Tax percentage updated successfully');
        setEditDialogOpen(false);
        setEditingTax(null);
        setTaxPercent('');
        fetchTaxes(); // Refresh the data
      } else {
        toast.error(response.message || 'Failed to update tax percentage');
      }
    } catch (error) {
      console.error('Error updating tax:', error);
      toast.error('Error updating tax percentage');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditDialogOpen(false);
    setEditingTax(null);
    setTaxPercent('');
    setTaxPercentError('');
  };

  // Show loading while user data is being loaded
  if (!user) {
    return (
      <PageContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (!canRead) {
    return (
      <PageContainer>
        <Alert severity="error">
          You don't have permission to view tax records.
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tax Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage tax percentages for different service types. You can only edit the tax percentages.
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {taxes.map((tax) => (
            <Grid item xs={12} md={6} key={tax.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="h2">
                      {tax.service_type.charAt(0).toUpperCase() + tax.service_type.slice(1)} Tax
                    </Typography>
                    {canUpdate && (
                      <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => handleEditClick(tax)}
                        size="small"
                      >
                        Edit
                      </Button>
                    )}
                  </Box>
                  
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Tax Percentage:
                      </Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {tax.tax_percent}%
                      </Typography>
                    </Box>
                  </Paper>
                  
                  <Box mt={2}>
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {new Date(tax.updated_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Tax Percentage - {editingTax?.service_type?.charAt(0).toUpperCase() + editingTax?.service_type?.slice(1)}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel htmlFor="tax-percent">Tax Percentage</InputLabel>
              <OutlinedInput
                id="tax-percent"
                type="number"
                value={taxPercent}
                onChange={handleTaxPercentChange}
                endAdornment={<InputAdornment position="end">%</InputAdornment>}
                inputProps={{
                  min: 1,
                  max: 98,
                  step: 0.01
                }}
                label="Tax Percentage"
                error={!!taxPercentError}
              />
            </FormControl>
            {taxPercentError && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                {taxPercentError}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Enter a value between 1 and 98
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<Cancel />} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
            disabled={saving || !!taxPercentError || !taxPercent}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer />
    </PageContainer>
  );
}
