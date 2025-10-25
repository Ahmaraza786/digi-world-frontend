// // components/DataTable.js
// import React, { useState } from 'react';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   TablePagination,
//   Paper,
//   IconButton,
//   Chip,
//   Avatar,
//   Box,
//   Typography,
//   TextField,
//   InputAdornment,
//   Toolbar,
//   Tooltip,
//   alpha,
// } from '@mui/material';
// import {
//   Edit as EditIcon,
//   Delete as DeleteIcon,
//   Visibility as ViewIcon,
//   Search as SearchIcon,
//   Add as AddIcon,
// } from '@mui/icons-material';
// import { styled } from '@mui/material/styles';

// const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
//   borderRadius: theme.shape.borderRadius * 2,
//   boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
//   overflow: 'hidden',
// }));

// const StyledTableHead = styled(TableHead)(({ theme }) => ({
//   backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f8fafc',
// }));

// const StyledTableRow = styled(TableRow)(({ theme }) => ({
//   '&:nth-of-type(odd)': {
//     backgroundColor: theme.palette.mode === 'dark' 
//       ? alpha(theme.palette.common.white, 0.02)
//       : alpha(theme.palette.common.black, 0.02),
//   },
//   '&:hover': {
//     backgroundColor: theme.palette.mode === 'dark'
//       ? alpha(theme.palette.common.white, 0.05)
//       : alpha(theme.palette.common.black, 0.05),
//     cursor: 'pointer',
//   },
//   '& .MuiTableCell-root': {
//     borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
//   },
// }));

// const StyledTableCell = styled(TableCell)(({ theme }) => ({
//   fontWeight: 500,
//   color: theme.palette.text.primary,
//   padding: '16px 24px',
// }));

// const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
//   fontWeight: 600,
//   color: theme.palette.text.primary,
//   textTransform: 'uppercase',
//   fontSize: '0.75rem',
//   letterSpacing: '0.05em',
//   padding: '20px 24px',
//   borderBottom: `2px solid ${theme.palette.divider}`,
// }));

// const ActionButton = styled(IconButton)(({ theme }) => ({
//   margin: '0 2px',
//   padding: '6px',
//   '&:hover': {
//     transform: 'scale(1.1)',
//     transition: 'transform 0.2s ease-in-out',
//   },
// }));

// const SearchToolbar = styled(Toolbar)(({ theme }) => ({
//   padding: '16px 24px',
//   backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
//   borderBottom: `1px solid ${theme.palette.divider}`,
//   display: 'flex',
//   justifyContent: 'space-between',
//   alignItems: 'center',
// }));

// // Helper function to get user initials for avatar
// const getUserInitials = (username) => {
//   if (!username) return 'U';
//   return username.charAt(0).toUpperCase();
// };

// // Helper function to generate avatar color
// const stringToColor = (string) => {
//   let hash = 0;
//   for (let i = 0; i < string.length; i += 1) {
//     hash = string.charCodeAt(i) + ((hash << 5) - hash);
//   }
//   let color = '#';
//   for (let i = 0; i < 3; i += 1) {
//     const value = (hash >> (i * 8)) & 0xff;
//     color += `00${value.toString(16)}`.slice(-2);
//   }
//   return color;
// };

// const DataTable = ({
//   data = [],
//   columns = [],
//   title = "Data Table",
//   onEdit,
//   onDelete,
//   onView,
//   onAdd,
//   searchable = true,
//   pageable = true,
//   rowsPerPageOptions = [5, 10, 25, 50],
//   defaultRowsPerPage = 10,
// }) => {
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
//   const [searchTerm, setSearchTerm] = useState('');

//   // Filter data based on search term
//   const filteredData = data.filter((item) =>
//     Object.values(item).some((value) =>
//       String(value).toLowerCase().includes(searchTerm.toLowerCase())
//     )
//   );

//   // Paginate data
//   const paginatedData = pageable 
//     ? filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//     : filteredData;

//   const handleChangePage = (event, newPage) => {
//     setPage(newPage);
//   };

//   const handleChangeRowsPerPage = (event) => {
//     setRowsPerPage(parseInt(event.target.value, 10));
//     setPage(0);
//   };

//   const handleSearch = (event) => {
//     setSearchTerm(event.target.value);
//     setPage(0);
//   };

//   const renderCellContent = (item, column) => {
//     const value = item[column.id];

//     switch (column.type) {
//       case 'avatar':
//         return (
//           <Box display="flex" alignItems="center" gap={2}>
//             <Avatar
//               sx={{
//                 bgcolor: stringToColor(value || ''),
//                 width: 40,
//                 height: 40,
//                 fontSize: '1rem',
//                 fontWeight: 600,
//               }}
//             >
//               {getUserInitials(value)}
//             </Avatar>
//             <Typography variant="body2" fontWeight={500}>
//               {value}
//             </Typography>
//           </Box>
//         );
//       case 'chip':
//         return (
//           <Chip
//             label={value}
//             size="small"
//             color={column.chipColor || 'default'}
//             variant="outlined"
//             sx={{ fontWeight: 500 }}
//           />
//         );
//       case 'email':
//         return (
//           <Typography variant="body2" color="text.secondary">
//             {value}
//           </Typography>
//         );
//       default:
//         return value;
//     }
//   };

//   return (
//     <StyledTableContainer component={Paper}>
//       {(searchable || onAdd) && (
//         <SearchToolbar>
//           <Typography variant="h6" component="h2" fontWeight={600}>
//             {title}
//           </Typography>
//           <Box display="flex" alignItems="center" gap={2}>
//             {searchable && (
//               <TextField
//                 size="small"
//                 placeholder="Search..."
//                 value={searchTerm}
//                 onChange={handleSearch}
//                 InputProps={{
//                   startAdornment: (
//                     <InputAdornment position="start">
//                       <SearchIcon />
//                     </InputAdornment>
//                   ),
//                 }}
//                 sx={{ minWidth: 250 }}
//               />
//             )}
//             {onAdd && (
//               <Tooltip title="Add New">
//                 <IconButton
//                   color="primary"
//                   onClick={onAdd}
//                   sx={{
//                     backgroundColor: 'primary.main',
//                     color: 'primary.contrastText',
//                     '&:hover': {
//                       backgroundColor: 'primary.dark',
//                     },
//                   }}
//                 >
//                   <AddIcon />
//                 </IconButton>
//               </Tooltip>
//             )}
//           </Box>
//         </SearchToolbar>
//       )}

//       <Table>
//         <StyledTableHead>
//           <TableRow>
//             {columns.map((column) => (
//               <StyledHeaderCell key={column.id} align={column.align || 'left'}>
//                 {column.label}
//               </StyledHeaderCell>
//             ))}
//             <StyledHeaderCell align="center">Actions</StyledHeaderCell>
//           </TableRow>
//         </StyledTableHead>
//         <TableBody>
//           {paginatedData.length === 0 ? (
//             <TableRow>
//               <StyledTableCell colSpan={columns.length + 1} align="center">
//                 <Typography variant="body2" color="text.secondary" py={4}>
//                   No data available
//                 </Typography>
//               </StyledTableCell>
//             </TableRow>
//           ) : (
//             paginatedData.map((row, index) => (
//               <StyledTableRow key={row.id || index}>
//                 {columns.map((column) => (
//                   <StyledTableCell key={column.id} align={column.align || 'left'}>
//                     {renderCellContent(row, column)}
//                   </StyledTableCell>
//                 ))}
//                 <StyledTableCell align="center">
//                   <Box display="flex" justifyContent="center" gap={0.5}>
//                     {onView && (
//                       <Tooltip title="View Details">
//                         <ActionButton
//                           size="small"
//                           onClick={() => onView(row)}
//                           sx={{ color: 'info.main' }}
//                         >
//                           <ViewIcon fontSize="small" />
//                         </ActionButton>
//                       </Tooltip>
//                     )}
//                     {onEdit && (
//                       <Tooltip title="Edit">
//                         <ActionButton
//                           size="small"
//                           onClick={() => onEdit(row)}
//                           sx={{ color: 'warning.main' }}
//                         >
//                           <EditIcon fontSize="small" />
//                         </ActionButton>
//                       </Tooltip>
//                     )}
//                     {onDelete && (
//                       <Tooltip title="Delete">
//                         <ActionButton
//                           size="small"
//                           onClick={() => onDelete(row)}
//                           sx={{ color: 'error.main' }}
//                         >
//                           <DeleteIcon fontSize="small" />
//                         </ActionButton>
//                       </Tooltip>
//                     )}
//                   </Box>
//                 </StyledTableCell>
//               </StyledTableRow>
//             ))
//           )}
//         </TableBody>
//       </Table>

//       {pageable && (
//         <TablePagination
//           rowsPerPageOptions={rowsPerPageOptions}
//           component="div"
//           count={filteredData.length}
//           rowsPerPage={rowsPerPage}
//           page={page}
//           onPageChange={handleChangePage}
//           onRowsPerPageChange={handleChangeRowsPerPage}
//           sx={{
//             borderTop: `1px solid ${alpha('#000', 0.12)}`,
//             backgroundColor: 'background.paper',
//           }}
//         />
//       )}
//     </StyledTableContainer>
//   );
// };

// export default DataTable;


// components/DataTable.js
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Chip,
  Box,
  Typography,
  Toolbar,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Define colors based on your requirements
const sidebarColor = '#f5f6fa'; // RGB(245, 246, 250)
const mainAreaColor = '#fcfcfc'; // RGB(252, 252, 252)
const primaryColor = '#1976d2';
const borderColor = '#e0e0e0';
const hoverColor = '#f5f5f5';
const textColor = '#333333';
const secondaryTextColor = '#666666';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: '8px',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
  overflow: 'hidden',
  backgroundColor: mainAreaColor,
  border: `1px solid ${borderColor}`,
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: sidebarColor,
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: mainAreaColor,
  '&:nth-of-type(even)': {
    backgroundColor: sidebarColor,
  },
  '&:hover': {
    backgroundColor: hoverColor,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  '& .MuiTableCell-root': {
    borderBottom: `1px solid ${borderColor}`,
  },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 400,
  color: textColor,
  padding: '14px 16px',
  fontSize: '0.875rem',
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 600,
  color: textColor,
  fontSize: '0.8rem',
  letterSpacing: '0.03em',
  padding: '16px',
  borderBottom: `2px solid ${borderColor}`,
  backgroundColor: sidebarColor,
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  margin: '0 4px',
  padding: '6px',
  backgroundColor: 'transparent',
  color: secondaryTextColor,
  '&:hover': {
    backgroundColor: sidebarColor,
    color: primaryColor,
    transform: 'scale(1.1)',
    transition: 'all 0.2s ease-in-out',
  },
}));

const ToolbarContainer = styled(Toolbar)(({ theme }) => ({
  padding: '16px 20px',
  backgroundColor: mainAreaColor,
  borderBottom: `1px solid ${borderColor}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const StyledChip = styled(Chip)(({ theme, status }) => {
  let chipColor;
  let backgroundColor;
  
  switch (status) {
    case 'active':
      chipColor = '#2e7d32';
      backgroundColor = '#edf7ed';
      break;
    case 'inactive':
      chipColor = '#d32f2f';
      backgroundColor = '#fdeaea';
      break;
    case 'pending':
      chipColor = '#ed6c02';
      backgroundColor = '#fff4e5';
      break;
    default:
      chipColor = secondaryTextColor;
      backgroundColor = sidebarColor;
  }
  
  return {
    color: chipColor,
    backgroundColor: backgroundColor,
    fontWeight: 500,
    fontSize: '0.75rem',
    height: '24px',
    borderRadius: '12px',
  };
});

const DataTable = ({
  data = [],
  columns = [],
  title = "User Management",
  onEdit,
  onDelete,
  onView,
  onAdd,
  searchable = false,
  pageable = true,
  rowsPerPageOptions = [5, 10, 25, 50],
  defaultRowsPerPage = 10,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Paginate data
  const paginatedData = pageable 
    ? data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : data;

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const renderCellContent = (item, column) => {
    const value = item[column.id];

    switch (column.type) {
      case 'chip':
        return (
          <StyledChip
            label={value}
            size="small"
            status={item.status || value.toLowerCase()}
          />
        );
      case 'email':
        return (
          <Typography variant="body2" color={secondaryTextColor}>
            {value}
          </Typography>
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
    <StyledTableContainer component={Paper}>
      {(onAdd) && (
        <ToolbarContainer>
          <Typography variant="h6" component="h2" fontWeight={600} color={textColor}>
            {title}
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            {onAdd && (
              <Tooltip title="Add New">
                <IconButton
                  onClick={onAdd}
                  sx={{
                    backgroundColor: primaryColor,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#1565c0',
                    },
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </ToolbarContainer>
      )}

      <Table>
        <StyledTableHead>
          <TableRow>
            {columns.map((column) => (
              <StyledHeaderCell key={column.id} align={column.align || 'left'}>
                {column.label}
              </StyledHeaderCell>
            ))}
            {(onView || onEdit || onDelete) && (
              <StyledHeaderCell align="center">Actions</StyledHeaderCell>
            )}
          </TableRow>
        </StyledTableHead>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <StyledTableCell 
                colSpan={columns.length + ((onView || onEdit || onDelete) ? 1 : 0)} 
                align="center"
                sx={{ py: 4 }}
              >
                <Typography variant="body2" color={secondaryTextColor}>
                  No data available
                </Typography>
              </StyledTableCell>
            </TableRow>
          ) : (
            paginatedData.map((row, index) => (
              <StyledTableRow key={row.id || index}>
                {columns.map((column) => (
                  <StyledTableCell key={column.id} align={column.align || 'left'}>
                    {renderCellContent(row, column)}
                  </StyledTableCell>
                ))}
                {(onView || onEdit || onDelete) && (
                  <StyledTableCell align="center">
                    <Box display="flex" justifyContent="center" gap={0.5}>
                      {onView && (
                        <Tooltip title="View Details">
                          <ActionButton
                            size="small"
                            onClick={() => onView(row)}
                          >
                            <ViewIcon fontSize="small" />
                          </ActionButton>
                        </Tooltip>
                      )}
                      {onEdit && (
                        <Tooltip title="Edit">
                          <ActionButton
                            size="small"
                            onClick={() => onEdit(row)}
                          >
                            <EditIcon fontSize="small" />
                          </ActionButton>
                        </Tooltip>
                      )}
                      {onDelete && (
                        <Tooltip title="Delete">
                          <ActionButton
                            size="small"
                            onClick={() => onDelete(row)}
                          >
                            <DeleteIcon fontSize="small" />
                          </ActionButton>
                        </Tooltip>
                      )}
                    </Box>
                  </StyledTableCell>
                )}
              </StyledTableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pageable && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            borderTop: `1px solid ${borderColor}`,
            backgroundColor: mainAreaColor,
            color: textColor,
            '& .MuiTablePagination-selectIcon': {
              color: textColor,
            },
          }}
        />
      )}
    </StyledTableContainer>
  );
};

export default DataTable;