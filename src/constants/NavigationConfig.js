// constants/NavigationConfig.js
export const NAVIGATION_CONFIG = {
  user: {
    displayName: 'User Management',
    routerLink: '/users',
    icon: '👥', // You can replace with actual icons
    requiredPermission: 'manage'
  },
  role: {
    displayName: 'Roles',
    routerLink: '/roles',
    icon: '📊',
    requiredPermission: 'view'
  },
  dashboard: {
    displayName: 'Dashboard',
    routerLink: '/dashboard',
    icon: '📊',
    requiredPermission: 'read'
  },
  material: {
    displayName: 'Materials',
    routerLink: '/materials',
    icon: '📦', // Changed from 📊 to 📦 for materials
    requiredPermission: 'view'
  },
  customer: {
    displayName: 'Customers',
    routerLink: '/customers',
    icon: '👥', // Changed from 📊 to 👥 for customers
    requiredPermission: 'view'
  },
  quotation: {
    displayName: 'Quotations',
    routerLink: '/quotations',
    icon: '📋', // Quotation icon
    requiredPermission: 'view'
  },
  purchase_order: {
    displayName: 'Purchase Orders',
    routerLink: '/purchase-orders',
    icon: '🛒', // Purchase order icon
    requiredPermission: 'view'
  },
  invoice: {
    displayName: 'Invoices',
    routerLink: '/invoices',
    icon: '🧾', // Invoice icon
    requiredPermission: 'view'
  },
  tax: {
    displayName: 'Tax',
    routerLink: '/tax',
    icon: '🧾', // Tax icon
    requiredPermission: 'view'
  },
  employee: {
    displayName: 'Employees',
    routerLink: '/employees',
    icon: '👨‍💼', // Employee icon
    requiredPermission: 'view'
  },
  employee_salary: {
    displayName: 'Salaries & Wages',
    routerLink: '/salaries',
    icon: '💰', // Salary icon
    requiredPermission: 'view'
  },
  reports: {
    displayName: 'Reports',
    routerLink: '/reports',
    icon: '📈',
    requiredPermission: 'view'
  },
  settings: {
    displayName: 'Settings',
    routerLink: '/settings',
    icon: '⚙️',
    requiredPermission: 'manage'
  }
};