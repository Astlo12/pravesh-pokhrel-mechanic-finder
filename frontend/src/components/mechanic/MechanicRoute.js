import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './css/MechanicWorkspace.css';

/**
 * Restricts children to logged-in mechanics only.
 */
const MechanicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mechws-page mechws-loading">
        <i className="fas fa-spinner fa-spin" /> Loading…
      </div>
    );
  }

  if (!user || user.user_type !== 'mechanic') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default MechanicRoute;
