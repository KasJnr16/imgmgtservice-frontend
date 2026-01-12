import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserRole } from '../utils/authStorage';
import PatientDashboard from '../pages/PatientDashboard';
import StaffDashboard from '../pages/StaffDashboard';
import AdminDashboard from '../pages/AdminDashboard';

interface RoleBasedRouteProps {
  children?: React.ReactNode;
}

export default function RoleBasedRoute({ children }: RoleBasedRouteProps) {
  const role = getUserRole();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  switch (role) {
    case 'PATIENT':
      return <PatientDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    case 'DOCTOR':
    case 'RADIOLOGIST':
      return <StaffDashboard />;
    default:
      return <PatientDashboard />;
  }
}
