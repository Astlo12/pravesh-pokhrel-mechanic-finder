import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAdminBookings, updateBookingStatusAdmin } from '../../services/api';
import './css/AdminBookings.css';

const AdminBookings = () => {
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search })
      };
      const response = await getAdminBookings(params);
      setBookings(response.data.bookings);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await updateBookingStatusAdmin(bookingId, newStatus);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update booking status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      accepted: '#3b82f6',
      rejected: '#ef4444',
      in_progress: '#8b5cf6',
      on_the_way: '#06b6d4',
      completed: '#10b981',
      cancelled: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="adminbookings-container">
      <div className="adminbookings-header">
        <div>
          <h1 className="adminbookings-title">Booking Management</h1>
          <p className="adminbookings-subtitle">Manage all bookings</p>
        </div>
        <Link to="/admin/dashboard" className="adminbookings-back-btn">
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </Link>
      </div>

      <div className="adminbookings-filters">
        <form onSubmit={handleSearch} className="adminbookings-search-form">
          <input
            type="text"
            placeholder="Search by customer or mechanic name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adminbookings-search-input"
          />
          <button type="submit" className="adminbookings-search-btn">
            <i className="fas fa-search"></i>
          </button>
        </form>

        <div className="adminbookings-filter">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="adminbookings-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="in_progress">In Progress</option>
            <option value="on_the_way">On The Way</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="adminbookings-loading">Loading bookings...</div>
      ) : error ? (
        <div className="adminbookings-error">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="adminbookings-empty">No bookings found</div>
      ) : (
        <>
          <div className="adminbookings-list">
            {bookings.map((booking) => (
              <div key={booking.id} className="adminbookings-card">
                <div className="adminbookings-card-header">
                  <div className="adminbookings-id">
                    <span className="adminbookings-id-label">Booking ID:</span>
                    <span className="adminbookings-id-value">{booking.id.slice(-8)}</span>
                  </div>
                  <span
                    className="adminbookings-status-badge"
                    style={{ backgroundColor: getStatusColor(booking.status) + '20', color: getStatusColor(booking.status) }}
                  >
                    {booking.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="adminbookings-card-body">
                  <div className="adminbookings-parties">
                    <div className="adminbookings-party">
                      <div className="adminbookings-party-header">
                        {booking.customer?.profile_picture ? (
                          <img
                            src={booking.customer.profile_picture}
                            alt={booking.customer.name}
                            className="adminbookings-avatar"
                          />
                        ) : (
                          <div className="adminbookings-avatar-placeholder">
                            {getInitials(booking.customer?.name)}
                          </div>
                        )}
                        <div>
                          <h4 className="adminbookings-party-label">Customer</h4>
                          <p className="adminbookings-party-name">{booking.customer?.name || 'N/A'}</p>
                          <p className="adminbookings-party-email">{booking.customer?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="adminbookings-arrow">
                      <i className="fas fa-arrow-right"></i>
                    </div>

                    <div className="adminbookings-party">
                      <div className="adminbookings-party-header">
                        {booking.mechanic?.user?.profile_picture ? (
                          <img
                            src={booking.mechanic.user.profile_picture}
                            alt={booking.mechanic.user.name}
                            className="adminbookings-avatar"
                          />
                        ) : (
                          <div className="adminbookings-avatar-placeholder">
                            {getInitials(booking.mechanic?.user?.name)}
                          </div>
                        )}
                        <div>
                          <h4 className="adminbookings-party-label">Mechanic</h4>
                          <p className="adminbookings-party-name">{booking.mechanic?.user?.name || 'N/A'}</p>
                          <p className="adminbookings-party-email">{booking.mechanic?.business_name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="adminbookings-details">
                    <div className="adminbookings-detail-row">
                      <span className="adminbookings-detail-label">Service Type:</span>
                      <span className="adminbookings-detail-value">{booking.service_type || 'N/A'}</span>
                    </div>
                    <div className="adminbookings-detail-row">
                      <span className="adminbookings-detail-label">Vehicle:</span>
                      <span className="adminbookings-detail-value">
                        {booking.vehicle_type} - {booking.vehicle_brand} {booking.vehicle_model}
                      </span>
                    </div>
                    {booking.description && (
                      <div className="adminbookings-detail-row">
                        <span className="adminbookings-detail-label">Description:</span>
                        <span className="adminbookings-detail-value">{booking.description}</span>
                      </div>
                    )}
                    <div className="adminbookings-detail-row">
                      <span className="adminbookings-detail-label">Created:</span>
                      <span className="adminbookings-detail-value">
                        {new Date(booking.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="adminbookings-card-actions">
                  <select
                    value={booking.status}
                    onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                    className="adminbookings-status-select"
                    style={{ borderColor: getStatusColor(booking.status) }}
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_the_way">On The Way</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="adminbookings-pagination">
              <button
                className="adminbookings-page-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <span className="adminbookings-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="adminbookings-page-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminBookings;

