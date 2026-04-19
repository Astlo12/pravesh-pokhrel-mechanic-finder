import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../../services/api';
import './css/AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getAdminStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard stats');
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admindashboard-container">
        <div className="admindashboard-loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admindashboard-container">
        <div className="admindashboard-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="admindashboard-container">
      <div className="admindashboard-header">
        <h1 className="admindashboard-title">Admin Dashboard</h1>
        <p className="admindashboard-subtitle">Overview of your platform</p>
      </div>

      <div className="admindashboard-stats-grid">
        <div className="admindashboard-stat-card">
          <div className="admindashboard-stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="admindashboard-stat-content">
            <h3 className="admindashboard-stat-value">{stats?.totalUsers || 0}</h3>
            <p className="admindashboard-stat-label">Total Customers</p>
          </div>
          <Link to="/admin/users?type=customer" className="admindashboard-stat-link">
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        <div className="admindashboard-stat-card">
          <div className="admindashboard-stat-icon">
            <i className="fas fa-tools"></i>
          </div>
          <div className="admindashboard-stat-content">
            <h3 className="admindashboard-stat-value">{stats?.totalMechanics || 0}</h3>
            <p className="admindashboard-stat-label">Total Mechanics</p>
          </div>
          <Link to="/admin/mechanics" className="admindashboard-stat-link">
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        <div className="admindashboard-stat-card">
          <div className="admindashboard-stat-icon">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className="admindashboard-stat-content">
            <h3 className="admindashboard-stat-value">{stats?.totalBookings || 0}</h3>
            <p className="admindashboard-stat-label">Total Bookings</p>
          </div>
          <Link to="/admin/bookings" className="admindashboard-stat-link">
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        <div className="admindashboard-stat-card">
          <div className="admindashboard-stat-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="admindashboard-stat-content">
            <h3 className="admindashboard-stat-value">{stats?.pendingBookings || 0}</h3>
            <p className="admindashboard-stat-label">Pending Bookings</p>
          </div>
          <Link to="/admin/bookings?status=pending" className="admindashboard-stat-link">
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        <div className="admindashboard-stat-card">
          <div className="admindashboard-stat-icon">
            <i className="fas fa-spinner"></i>
          </div>
          <div className="admindashboard-stat-content">
            <h3 className="admindashboard-stat-value">{stats?.activeBookings || 0}</h3>
            <p className="admindashboard-stat-label">Active Bookings</p>
          </div>
          <Link to="/admin/bookings?status=in_progress" className="admindashboard-stat-link">
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        <div className="admindashboard-stat-card">
          <div className="admindashboard-stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="admindashboard-stat-content">
            <h3 className="admindashboard-stat-value">{stats?.completedBookings || 0}</h3>
            <p className="admindashboard-stat-label">Completed Bookings</p>
          </div>
          <Link to="/admin/bookings?status=completed" className="admindashboard-stat-link">
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        <div className="admindashboard-stat-card">
          <div className="admindashboard-stat-icon">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div className="admindashboard-stat-content">
            <h3 className="admindashboard-stat-value">{stats?.verifiedMechanics || 0}</h3>
            <p className="admindashboard-stat-label">Verified Mechanics</p>
          </div>
          <Link to="/admin/verification" className="admindashboard-stat-link">
            Manage <i className="fas fa-arrow-right"></i>
          </Link>
        </div>

        <div className="admindashboard-stat-card">
          <div className="admindashboard-stat-icon">
            <i className="fas fa-circle"></i>
          </div>
          <div className="admindashboard-stat-content">
            <h3 className="admindashboard-stat-value">{stats?.onlineMechanics || 0}</h3>
            <p className="admindashboard-stat-label">Online Mechanics</p>
          </div>
          <Link to="/admin/mechanics?online=true" className="admindashboard-stat-link">
            View All <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
      </div>

      <div className="admindashboard-recent-section">
        <div className="admindashboard-recent-card">
          <h2 className="admindashboard-recent-title">Recent Activity</h2>
          <div className="admindashboard-recent-stats">
            <div className="admindashboard-recent-item">
              <i className="fas fa-calendar-plus"></i>
              <div>
                <p className="admindashboard-recent-value">{stats?.recentBookings || 0}</p>
                <p className="admindashboard-recent-label">New Bookings (7 days)</p>
              </div>
            </div>
            <div className="admindashboard-recent-item">
              <i className="fas fa-user-plus"></i>
              <div>
                <p className="admindashboard-recent-value">{stats?.newUsers || 0}</p>
                <p className="admindashboard-recent-label">New Users (7 days)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

