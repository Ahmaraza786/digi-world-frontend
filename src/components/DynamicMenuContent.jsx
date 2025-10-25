// dashboard/components/DynamicMenuContent.jsx
import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const DynamicMenuContent = () => {
  const { getAvailableNavigationItems } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const navigationItems = getAvailableNavigationItems();

  const handleNavigation = (path) => {
    navigate(path);
  };

  if (navigationItems.length === 0) {
    return (
      <List>
        <ListItem>
          <ListItemText 
            primary="No accessible modules" 
            sx={{ color: 'text.secondary', textAlign: 'center' }}
          />
        </ListItem>
      </List>
    );
  }

  return (
    <List>
      {navigationItems.map((item) => (
        <ListItem key={item.key} disablePadding>
          <ListItemButton
            selected={location.pathname === item.routerLink}
            onClick={() => handleNavigation(item.routerLink)}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.light',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.displayName} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};

export default DynamicMenuContent;