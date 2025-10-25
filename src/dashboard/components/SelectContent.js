import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import { 
  BrushRounded,          
} from '@mui/icons-material';

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

const CompanyAvatar = styled(Avatar)(({ theme }) => ({
  width: 32,
  height: 32,
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#2c2c2c',
  color: '#ffffff',
  fontSize: '1rem',
  fontWeight: 600,
  boxShadow: theme.palette.mode === 'dark' 
    ? '0 2px 8px rgba(0,0,0,0.3)'
    : '0 2px 4px rgba(0,0,0,0.15)',
}));

// Option 1: Paint Brush Icon (Recommended for Paint Company)
export default function CompanyBranding() {
  return (
    <CompanyContainer>
      <CompanyAvatar>
        <BrushRounded sx={{ fontSize: '1.3rem' }} />
      </CompanyAvatar>
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
