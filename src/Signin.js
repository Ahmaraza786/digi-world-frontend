import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CssBaseline from '@mui/material/CssBaseline';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ForgotPassword from './components/ForgotPassword';
import AppTheme from './shared-theme/AppTheme';
import ColorModeSelect from './shared-theme/ColorModeSelect';
import { SitemarkIcon } from './components/Customicon';
import { useAuth } from './auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useApi } from './hooks/useApi';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: 'auto',
  backgroundColor: '#ffffff', // Ensure card background is white
  [theme.breakpoints.up('sm')]: {
    maxWidth: '450px',
  },
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  ...theme.applyStyles('dark', {
    backgroundColor: '#ffffff', // Force white background even in dark mode
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100%',
  padding: theme.spacing(2),
  backgroundColor: '#ffffff', // White background
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundColor: '#ffffff', // White background
    backgroundImage: 'none', // Remove gradient
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundColor: '#ffffff', // Force white background in dark mode too
      backgroundImage: 'none',
    }),
  },
}));

const BlueButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#1976d2', // Blue color
  color: '#ffffff',
  '&:hover': {
    backgroundColor: '#1565c0', // Darker blue on hover
  },
  '&:disabled': {
    backgroundColor: '#bbdefb', // Light blue when disabled
    color: '#ffffff',
  },
}));

export default function SignIn(props) {
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [validatingToken, setValidatingToken] = React.useState(true);

  const { login, getRedirectRoute, logout, token: existingToken } = useAuth();
  const { post, get } = useApi();
  const navigate = useNavigate();

  // Check for existing token on component mount
  React.useEffect(() => {
    const validateExistingToken = async () => {
      const storedToken = localStorage.getItem('authToken');
      
      if (storedToken) {
        try {
          // Validate the token with the backend
          const response = await get('/api/auth/validate', { requiresAuth: true });
          
          if (response.valid) {
            // Token is valid, redirect to appropriate page
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const redirectRoute = getRedirectRoute(userData);
            navigate(redirectRoute);
          } else {
            // Token is invalid, remove it and proceed with normal flow
            logout();
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          // If validation fails, remove the token and proceed
          logout();
        }
      }
      
      setValidatingToken(false);
    };

    validateExistingToken();
  }, [get, navigate, getRedirectRoute, logout]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateInputs()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData(event.currentTarget);
      const payload = {
        usernameOrEmail: formData.get('email'),
        password: formData.get('password')
      };
      
      const data = await post('/api/auth/signin', payload, { requiresAuth: false });
      
      if (data.success) {
        toast.success('Login successful! Redirecting...', {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        login(data.token, data.data);
        const redirectRoute = getRedirectRoute(data.data);
        
        // Small delay to show the success message
        setTimeout(() => {
          navigate(redirectRoute);
        }, 1000);
      } else {
        toast.error(data.message || 'Login failed', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (err) {
      toast.error('An error occurred during login. Please try again.', {
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

  const validateInputs = () => {
    const email = document.getElementById('email');
    const password = document.getElementById('password');

    let isValid = true;

    if (!email.value) {
      setEmailError(true);
      setEmailErrorMessage('Please enter your email or username.');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    if (!password.value) {
      setPasswordError(true);
      setPasswordErrorMessage('Please enter your password.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    return isValid;
  };

  // Show loading state while validating token
  if (validatingToken) {
    return (
      <AppTheme {...props}>
        <CssBaseline enableColorScheme />
        <SignInContainer 
          direction="column" 
          justifyContent="center" 
          alignItems="center"
        >
          <Typography variant="h6" sx={{ color: '#333' }}>Checking authentication...</Typography>
        </SignInContainer>
      </AppTheme>
    );
  }

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="space-between">
        {/* <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} /> */}
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography
            component="h1"
            variant="h4"
            sx={{ 
              width: '100%', 
              fontSize: 'clamp(2rem, 10vw, 2.15rem)',
              color: '#333' // Dark text for contrast on white background
            }}
          >
            Sign in
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: 2,
            }}
          >
            <FormControl>
              <FormLabel htmlFor="email" sx={{ color: '#333' }}>Email or Username</FormLabel>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="text"
                name="email"
                placeholder="your@email.com or username"
                autoComplete="email"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={emailError ? 'error' : 'primary'}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                  }
                }}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="password" sx={{ color: '#333' }}>Password</FormLabel>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                name="password"
                placeholder="••••••"
                type="password"
                id="password"
                autoComplete="current-password"
                required
                fullWidth
                variant="outlined"
                color={passwordError ? 'error' : 'primary'}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#ffffff',
                  }
                }}
              />
            </FormControl>
            <ForgotPassword open={open} handleClose={handleClose} />
            <BlueButton
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </BlueButton>
            <Link
              component="button"
              type="button"
              onClick={handleClickOpen}
              variant="body2"
              sx={{ 
                alignSelf: 'center',
                color: '#1976d2', // Blue color for link
                '&:hover': {
                  color: '#1565c0'
                }
              }}
              disabled={isLoading}
            >
              Forgot your password?
            </Link>
          </Box>
          <Divider sx={{ color: '#666' }}>Diamond Paints</Divider>
        </Card>
        
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
      </SignInContainer>
    </AppTheme>
  );
}