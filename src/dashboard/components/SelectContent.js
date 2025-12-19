import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const CompanyContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)',
  border: `1px solid ${theme.vars ? theme.vars.palette.divider : theme.palette.divider}`,
  width: 215, // Match the original SelectContent width
  maxWidth: '100%',
  minHeight: 48, // Ensure consistent height
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
}));

// Company Branding with Logo
export default function CompanyBranding() {
  return (
    <CompanyContainer>
      <LogoContainer>
        <img 
          src="/header_inside.svg" 
          alt="Digital World Logo"
        />
      </LogoContainer>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600, 
            lineHeight: '18px',
            color: 'text.primary',
            letterSpacing: '0.02em'
          }}
        >
          Digital World
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'text.secondary',
            fontSize: '0.75rem',
            lineHeight: '12px',
            fontWeight: 400
          }}
        >
          All Solutions
        </Typography>
      </Box>
    </CompanyContainer>
  );
}
