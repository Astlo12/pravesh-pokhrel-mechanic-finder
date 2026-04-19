import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatUnreadProvider } from './context/ChatUnreadContext';
import useMechanicLocationTracking from './hooks/useMechanicLocationTracking';
import Navbar from './components/Navbar';
import Home from './components/landing/Home';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import OTPVerification from './components/auth/OTPVerification';
import ResetPassword from './components/auth/ResetPassword';
import MechanicProfileSetup from './components/auth/MechanicProfileSetup';
import MechanicList from './components/MechanicList';
import MechanicProfile from './components/MechanicProfile';
import CustomerProfile from './components/CustomerProfile';
import Booking from './components/Booking';
import BookingTracking from './components/BookingTracking';
import Dashboard from './components/Dashboard';
import MyBookings from './components/MyBookings';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminMechanics from './components/admin/AdminMechanics';
import AdminBookings from './components/admin/AdminBookings';
import AdminVerification from './components/admin/AdminVerification';
import MechanicRoute from './components/mechanic/MechanicRoute';
import MechanicProfileEdit from './components/mechanic/MechanicProfileEdit';
import MechanicReviewsWorkspace from './components/mechanic/MechanicReviewsWorkspace';
import MechanicServiceHistory from './components/mechanic/MechanicServiceHistory';
import MechanicMessages from './components/mechanic/MechanicMessages';
import MechanicBookingList from './components/mechanic/MechanicBookingList';
import CustomerServiceHistory from './components/CustomerServiceHistory';
import NotificationsPage from './components/notifications/NotificationsPage';
import CustomerChatPage from './components/chat/CustomerChatPage';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (user.user_type !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  
  // Automatically track mechanic location when logged in
  useMechanicLocationTracking();
  
  return (
    <Router>
      <SocketProvider user={user}>
        <ChatUnreadProvider user={user}>
          <Navbar />
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/otp-verification" element={<OTPVerification />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/mechanic-profile-setup"
            element={
              <PrivateRoute>
                <MechanicProfileSetup />
              </PrivateRoute>
            }
          />
          <Route path="/mechanics" element={<MechanicList />} />
          <Route path="/mechanic/:id" element={<MechanicProfile />} />
          <Route
            path="/booking/:mechanicId"
            element={
              <PrivateRoute>
                <Booking />
              </PrivateRoute>
            }
          />
          <Route
            path="/track-booking/:bookingId"
            element={
              <PrivateRoute>
                <BookingTracking />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <PrivateRoute>
                <MyBookings />
              </PrivateRoute>
            }
          />
          <Route
            path="/service-history"
            element={
              <PrivateRoute>
                <CustomerServiceHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <NotificationsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:bookingId"
            element={
              <PrivateRoute>
                <CustomerChatPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <CustomerProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/mechanic/workspace/edit-profile"
            element={
              <PrivateRoute>
                <MechanicRoute>
                  <MechanicProfileEdit />
                </MechanicRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/mechanic/workspace/reviews"
            element={
              <PrivateRoute>
                <MechanicRoute>
                  <MechanicReviewsWorkspace />
                </MechanicRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/mechanic/workspace/history"
            element={
              <PrivateRoute>
                <MechanicRoute>
                  <MechanicServiceHistory />
                </MechanicRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/mechanic/workspace/messages"
            element={
              <PrivateRoute>
                <MechanicRoute>
                  <MechanicMessages />
                </MechanicRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/mechanic/workspace/bookings"
            element={
              <PrivateRoute>
                <MechanicRoute>
                  <MechanicBookingList />
                </MechanicRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/mechanics"
            element={
              <AdminRoute>
                <AdminMechanics />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <AdminRoute>
                <AdminBookings />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/verification"
            element={
              <AdminRoute>
                <AdminVerification />
              </AdminRoute>
            }
          />
        </Routes>
        </ChatUnreadProvider>
      </SocketProvider>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
