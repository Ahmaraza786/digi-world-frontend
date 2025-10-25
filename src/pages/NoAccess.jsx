// pages/NoAccess.jsx
import React from 'react';
import { Typography, Box, Container } from '@mui/material';

const NoAccess = () => {
  return (
    <Container maxWidth="sm">
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h4" gutterBottom>
          No Access
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You don't have access to any modules. Please contact your administrator.
        </Typography>
      </Box>
    </Container>
  );
};

export default NoAccess;