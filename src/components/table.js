// components/DataTable.js
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Button,
  Tooltip,
  TableSortLabel
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const DataTable = ({
  data = [],
  columns = [],
  title = '',
  onView,
  onEdit,
  onDelete,
  onAdd,
  searchPlaceholder = 'Search...',
  sx = {},
  showActions = true,
  showSearch = true,
  showAddButton = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Generate avatar color based on username
  const getAvatarColor = (username) => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(item =>
      Object.values(item).some(value =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig]);

  const handleSort = (columnId) => {
    setSortConfig(prevConfig => ({
      key: columnId,
      direction: prevConfig.key === columnId && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Render cell content based on column type
  const renderCellContent = (item, column) => {
    const value = item[column.id];
    
    switch (column.type) {
      case 'avatar':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{ 
                bgcolor: getAvatarColor(value || ''),
                width: 32,
                height: 32,
                fontSize: '0.875rem'
              }}
            >
              {(value || '').charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {value}
            </Typography>
          </Box>
        );
      
      case 'email':
        return (
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            {value}
          </Typography>
        );
      
      case 'chip':
        const chipColor = column.chipColor || 'default';
        const chipColors = {
          'Admin': '#ff5722',
          'Manager': '#2196f3', 
          'Sales Rep': '#4caf50',
          'Accountant': '#ff9800',
          'Warehouse': '#9c27b0'
        };
        
        return (
          <Chip
            label={value}
            size="small"
            sx={{
              backgroundColor: chipColors[value] || '#757575',
              color: 'white',
              fontWeight: 500,
              '& .MuiChip-label': {
                px: 1.5
              }
            }}
          />
        );
      
      default:
        return (
          <Typography variant="body2">
            {value}
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with title, search, and add button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {showSearch && (
            <TextField
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          )}
          
          {showAddButton && onAdd && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAdd}
              sx={{
                backgroundColor: '#424242',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#616161'
                }
              }}
            >
              Add New
            </Button>
          )}
        </Box>
      </Box>

      {/* Horizontally scrollable table container */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          width: '100%',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          ...sx 
        }}
      >
        <Table sx={{ minWidth: 650 }} stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{ 
                    backgroundColor: '#f5f5f5',
                    fontWeight: 600,
                    color: 'text.primary',
                    borderBottom: '2px solid #e0e0e0',
                    whiteSpace: 'nowrap'
                  }}
                  sortDirection={sortConfig.key === column.id ? sortConfig.direction : false}
                >
                  <TableSortLabel
                    active={sortConfig.key === column.id}
                    direction={sortConfig.key === column.id ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              {showActions && (
                <TableCell 
                  align="center"
                  sx={{ 
                    backgroundColor: '#f5f5f5',
                    fontWeight: 600,
                    color: 'text.primary',
                    borderBottom: '2px solid #e0e0e0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {filteredAndSortedData.length > 0 ? (
              filteredAndSortedData.map((item, index) => (
                <TableRow 
                  key={item.id || index}
                  sx={{ 
                    '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                    '&:hover': { backgroundColor: '#f0f0f0' },
                    '& td': { borderBottom: '1px solid #e0e0e0' }
                  }}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={column.id} 
                      align={column.align || 'left'}
                      sx={{ whiteSpace: 'nowrap', py: 2 }}
                    >
                      {renderCellContent(item, column)}
                    </TableCell>
                  ))}
                  
                  {showActions && (
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap', py: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        {onView && (
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={() => onView(item)}
                              sx={{ color: '#757575', '&:hover': { color: '#424242' } }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {onEdit && (
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => onEdit(item)}
                              sx={{ color: '#757575', '&:hover': { color: '#1976d2' } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {onDelete && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => onDelete(item)}
                              sx={{ color: '#757575', '&:hover': { color: '#d32f2f' } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (showActions ? 1 : 0)} 
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm ? 'No results found for your search.' : 'No data available.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Results counter */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredAndSortedData.length} of {data.length} entries
          {searchTerm && ` (filtered by "${searchTerm}")`}
        </Typography>
      </Box>
    </Box>
  );
};

export default DataTable;