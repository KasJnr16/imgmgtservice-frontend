import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/authStorage';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
