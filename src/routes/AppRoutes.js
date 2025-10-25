import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from '../Signin';
import { useAuth } from '../auth/AuthContext';
import { AuthProvider } from '../auth/AuthContext';
import DashboardLayout from '../dashboard/components/DashboardLayout';
// import DashboardHome from '../pages/DashboardHome';
// import UserManagement from '../pages/UserManagement';
import RoleManagement from '../pages/Role';
import UserManagement from '../pages/UserManagement';
import MaterialManagement from '../pages/MaterialManagement';
import CustomerManagement from '../pages/CustomerManagement';
import QuotationManagement from '../pages/QuotationManagement';
import PurchaseOrderManagement from '../pages/PurchaseOrderManagement';
import InvoiceManagement from '../pages/InvoiceManagement';
import DashboardHome from '../pages/DashboardHome';
import TaxManagement from '../pages/TaxManagement';
import FeatureManagement from '../pages/Feature';
import EmployeeManagement from '../pages/EmployeeManagement';
import SalaryManagement from '../pages/SalaryManagement';
// import Reports from '../pages/Reports';
// import Settings from '../pages/Settings';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/signin" />;
};

const AppRoutesContent = () => {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      
      {/* Dashboard Layout Route - contains navbar and sidebar */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="roles" element={<RoleManagement />} />
        <Route path="materials" element={<MaterialManagement />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="quotations" element={<QuotationManagement />} />
        <Route path="purchase-orders" element={<PurchaseOrderManagement />} />
        <Route path="invoices" element={<InvoiceManagement />} />
        <Route path="tax" element={<TaxManagement />} />
        <Route path="employees" element={<EmployeeManagement />} />
        <Route path="salaries" element={<SalaryManagement />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Route>
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/signin" />} />
    </Routes>
  );
};

const AppRoutes = () => {
  return (
    <AuthProvider>
      <AppRoutesContent />
    </AuthProvider>
  );
};

export default AppRoutes;