import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridActionsCellItem,
  gridClasses,
  
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SendIcon from '@mui/icons-material/Send';
import { GridToolbar } from '@mui/x-data-grid/internals';
const INITIAL_PAGE_SIZE = 10;

const ReusableDataTable = ({
  // Data props
  data = [],
  columns = [],
  loading = false,
  error = null,
  
  // Pagination props
  paginationModel = { page: 0, pageSize: INITIAL_PAGE_SIZE },
  onPaginationModelChange = () => {},
  rowCount = 0,
  
  // Sorting props
  sortModel = [],
  onSortModelChange = () => {},
  
  // Filtering props
  filterModel = { items: [] },
  onFilterModelChange = () => {},
  
  // Action handlers
  onView = null,
  onEdit = null,
  onDelete = null,
  onExport = null,
  onDownload = null,
  onViewPdf = null,
  onSendEmail = null,
  onCreate = null,
  onRefresh = null,
  exportingQuotationId = null, // ID of quotation being exported
  downloadingInvoiceId = null, // ID of invoice being downloaded
  loadingPdfPreview = false, // Loading state for PDF preview
  viewingPdfQuotationId = null, // ID of quotation being previewed
  viewingPdfInvoiceId = null, // ID of invoice being previewed
  
  // Row interaction
  onRowClick = null,
  
  // Table configuration
  title = '',
  showToolbar = true,
  pageSizeOptions = [5, INITIAL_PAGE_SIZE, 25],
  disableRowSelectionOnClick = true,
  
  // Server-side vs client-side
  paginationMode = 'client', // 'client' | 'server'
  sortingMode = 'client', // 'client' | 'server'
  filterMode = 'client', // 'client' | 'server'
  
  // Additional props
  sx = {},
  ...otherProps
}) => {
  // Memoize columns with actions
  const enhancedColumns = React.useMemo(() => {
    const baseColumns = columns.map(column => ({
      ...column,
      // Ensure other columns can flex to fill available space, but respect existing flex values
      flex: column.flex !== undefined ? column.flex : (column.field !== 'actions' ? 1 : undefined),
      minWidth: column.minWidth || 100, // Add minimum width for other columns
    }));
    
    // Add actions column if any action handlers are provided
    if (onView || onEdit || onDelete || onExport || onDownload || onViewPdf || onSendEmail) {
      const actionsColumn = {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        width: 200,
        minWidth: 150,
        maxWidth: 200,
        align: 'right',
        headerAlign: 'right',
        cellClassName: 'actions-column',
        getActions: ({ row }) => {
          const actions = [];
          
          if (onView) {
            actions.push(
              <GridActionsCellItem
                key="view-item"
                icon={<VisibilityIcon />}
                label="View"
                onClick={() => onView(row)}
              />
            );
          }
          
          if (onEdit) {
            actions.push(
              <GridActionsCellItem
                key="edit-item"
                icon={<EditIcon />}
                label="Edit"
                onClick={() => onEdit(row)}
              />
            );
          }
          
          if (onDelete) {
            actions.push(
              <GridActionsCellItem
                key="delete-item"
                icon={<DeleteIcon />}
                label="Delete"
                onClick={() => onDelete(row)}
              />
            );
          }
          
          if (onExport) {
            const isExporting = exportingQuotationId === row.id || downloadingInvoiceId === row.id;
            actions.push(
              <GridActionsCellItem
                key="export-item"
                icon={isExporting ? <CircularProgress size={20} /> : <FileDownloadIcon />}
                label={isExporting ? "Exporting..." : "Export PDF"}
                onClick={() => !isExporting && onExport(row)}
                disabled={isExporting}
              />
            );
          }
          
          if (onDownload) {
            const isDownloading = downloadingInvoiceId === row.id;
            actions.push(
              <GridActionsCellItem
                key="download-pdf-item"
                icon={isDownloading ? <CircularProgress size={20} /> : <GetAppIcon />}
                label={isDownloading ? "Downloading PDF..." : "Download PDF"}
                onClick={() => !isDownloading && onDownload(row)}
                disabled={isDownloading}
              />
            );
          }
          
          if (onViewPdf) {
            // Check if loading: either quotation or invoice
            const isLoading = (loadingPdfPreview && viewingPdfQuotationId === row.id) || 
                             (loadingPdfPreview && viewingPdfInvoiceId === row.id);
            actions.push(
              <GridActionsCellItem
                key="view-pdf-item"
                icon={isLoading ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
                label="View PDF"
                onClick={() => onViewPdf(row)}
                disabled={isLoading}
              />
            );
          }
          
          // Only show Send Email button for pending quotations
          if (onSendEmail && row.status === 'pending') {
            actions.push(
              <GridActionsCellItem
                key="send-email-item"
                icon={<SendIcon sx={{ color: '#10b981' }} />}
                label="Send Email"
                onClick={() => onSendEmail(row)}
              />
            );
          }
          
          return actions;
        },
      };
      
      baseColumns.push(actionsColumn);
    }
    
    return baseColumns;
  }, [columns, onView, onEdit, onDelete, onExport, onDownload, onViewPdf, onSendEmail, exportingQuotationId, downloadingInvoiceId, loadingPdfPreview, viewingPdfQuotationId, viewingPdfInvoiceId]);

  const initialState = React.useMemo(
    () => ({
      pagination: { paginationModel: { pageSize: INITIAL_PAGE_SIZE } },
    }),
    [],
  );

  const defaultSx = {
    width: '100%',
    [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
      outline: 'transparent',
    },
    
     // Grey background for filter area (top toolbar)
    // [`& .${gridClasses.}`]: {
    //   backgroundColor: 'white',
    //   // padding: 1,
    //   borderBottom: 1,
    //   // borderColor: 'grey.300',
    // },
    //  '& .MuiDataGrid-panelContent': {
    //   backgroundColor: 'white !important',
    // },
    // [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]: {
    //   outline: 'none',
    // },
    [`& .${gridClasses.row}:hover`]: {
      cursor: onRowClick ? 'pointer' : 'default',
    },
    // Ensure the table container takes full width
    // '& .MuiDataGrid-main': {
    //   width: '100%',
    // },
    // Style for actions column to prevent shrinking
    '& .actions-column': {
      minWidth: '150px !important',
    },
    ...sx,
  };

  const handleRowClick = React.useCallback(
    (params) => {
      if (onRowClick) {
        onRowClick(params);
      }
    },
    [onRowClick],
  );

  const handleRefresh = React.useCallback(() => {
    if (onRefresh && !loading) {
      onRefresh();
    }
  }, [onRefresh, loading]);

  const handleCreate = React.useCallback(() => {
    if (onCreate) {
      onCreate();
    }
  }, [onCreate]);

  return (
    <Box sx={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Actions */}
      {(onCreate || onRefresh) && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {onRefresh && (
              <Tooltip title="Reload data" placement="left" enterDelay={1000}>
                <div>
                  <IconButton
                    size="small"
                    aria-label="refresh"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </div>
              </Tooltip>
            )}
            {onCreate && (
              <Button
                variant="contained"
                onClick={handleCreate}
                startIcon={<AddIcon />}
                disabled={loading}
              >
                Create
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {/* Error Display */}
      {error ? (
        <Box sx={{ flexGrow: 1, mb: 2 }}>
          <Alert severity="error">
            {typeof error === 'string' ? error : error.message || 'An error occurred'}
          </Alert>
        </Box>
      ) : (
        /* Data Grid */
        <Box sx={{ flex: 1, width: '100%', minHeight: 400 }}>
            <DataGrid
              rows={data}
              rowCount={paginationMode === 'server' ? rowCount : undefined}
              columns={enhancedColumns}
            
              // Pagination
              pagination
              paginationMode={paginationMode}
              paginationModel={paginationModel}
              onPaginationModelChange={onPaginationModelChange}
              pageSizeOptions={pageSizeOptions}
            
              // Sorting
              sortingMode={sortingMode}
              sortModel={sortModel}
              onSortModelChange={onSortModelChange}
            
              // Filtering
              filterMode={filterMode}
              filterModel={filterModel}
              onFilterModelChange={onFilterModelChange}
            
              // Row interaction
              disableRowSelectionOnClick={disableRowSelectionOnClick}
              onRowClick={handleRowClick}


            
              // Loading state
              loading={loading}
            
              // Configuration
              initialState={initialState}
              showToolbar={ true}
              sx={defaultSx}
            

            
              // Slot props for customization
              slotProps={{
                loadingOverlay: {
                  variant: 'circular-progress',
                  noRowsVariant: 'circular-progress',
                },
                baseIconButton: {
                  size: 'small',
                },
                toolbar: {
                showQuickFilter: false
              },
              ...otherProps.slotProps,
            }}
            
            {...otherProps}
          />
        </Box>
      )}
    </Box>
  );
};

export default ReusableDataTable;

