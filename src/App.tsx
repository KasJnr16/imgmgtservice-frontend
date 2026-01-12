import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UserManagementPage from './pages/UserManagementPage';
import PatientRecordsPage from './pages/PatientRecordsPage';
import ProfilePage from './pages/ProfilePage';
import BillingPage from './pages/BillingPage';
import StaffPatientProfilePage from './pages/StaffPatientProfilePage';
import MyImagesPage from './pages/MyImagesPage';
import ImageReviewPage from './pages/ImageReviewPage';
import AdminImageReviewPage from './pages/AdminImageReviewPage';
import AdminPatientProfilePage from './pages/AdminPatientProfilePage';
import AdminStaffProfilePage from './pages/AdminStaffProfilePage';
import MyHealthPage from './pages/MyHealthPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import StaffReportsPage from './pages/StaffReportsPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleBasedRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient-records"
            element={
              <ProtectedRoute>
                <PatientRecordsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient-records/:patientId"
            element={
              <ProtectedRoute>
                <StaffPatientProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-images"
            element={
              <ProtectedRoute>
                <MyImagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-health"
            element={
              <ProtectedRoute>
                <MyHealthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/image-review"
            element={
              <ProtectedRoute>
                <ImageReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/reports"
            element={
              <ProtectedRoute>
                <StaffReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/image-review"
            element={
              <ProtectedRoute>
                <AdminImageReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients/:patientId"
            element={
              <ProtectedRoute>
                <AdminPatientProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff/:staffId"
            element={
              <ProtectedRoute>
                <AdminStaffProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
