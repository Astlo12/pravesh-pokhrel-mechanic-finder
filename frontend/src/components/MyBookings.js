import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomerBookings } from '../services/api';
import { useChatUnread } from '../context/ChatUnreadContext';
import { labelForStatus } from '../utils/bookingFlow';
import { isBookingChatAllowed } from '../utils/bookingChat';
import RateMechanicModal, { StarDisplay } from './RateMechanicModal';
import './css/MyBookings.css';

const MyBookings = () => {
  const navigate = useNavigate();
  const { countForBooking: chatUnreadForBooking } = useChatUnread();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rateModalBooking, setRateModalBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery, statusFilter]);

  const fetchBookings = async () => {
    try {
      const response = await getCustomerBookings();
      setBookings(response.data);
      setFilteredBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((b) => {
        const mechanicName = (b.mechanic_name || b.business_name || '').toLowerCase();
        const serviceType = (b.service_type || '').toLowerCase();
        const bookingId = (b.id || b._id?.toString() || '').toLowerCase();
        return (
          mechanicName.includes(query) || serviceType.includes(query) || bookingId.includes(query)
        );
      });
    }

    setFilteredBookings(filtered);
  };

  const getMechanicInitials = (name) => {
    if (!name) return 'M';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: 'mybookings-status-pending',
      accepted: 'mybookings-status-accepted',
      mechanic_arrived: 'mybookings-status-wait',
      arrival_confirmed: 'mybookings-status-accepted',
      in_progress: 'mybookings-status-inprogress',
      completion_pending: 'mybookings-status-wait',
      completed: 'mybookings-status-completed',
      cancelled: 'mybookings-status-cancelled',
      rejected: 'mybookings-status-cancelled',
    };
    return statusMap[status] || 'mybookings-status-pending';
  };

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;

  const onRatedSuccess = () => {
    fetchBookings();
  };

  if (loading) {
    return <div className="mybookings-loading">Loading bookings...</div>;
  }

  return (
    <div className="mybookings-container">
      {rateModalBooking && (
        <RateMechanicModal
          bookingId={rateModalBooking.id || rateModalBooking._id}
          mechanicName={rateModalBooking.mechanic_name || rateModalBooking.business_name}
          onClose={() => setRateModalBooking(null)}
          onSuccess={onRatedSuccess}
        />
      )}

      <div className="mybookings-header">
        <div className="mybookings-header-left">
          <button className="mybookings-back-btn" onClick={() => navigate('/dashboard')}>
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
          <h1 className="mybookings-title">My bookings</h1>
          <p className="mybookings-subtitle">Track active jobs, view history, and rate completed services.</p>
        </div>
        <button className="mybookings-new-booking-btn" onClick={() => navigate('/mechanics')}>
          <i className="fas fa-wrench"></i>
          <i className="fas fa-hammer"></i>
          New Booking
        </button>
      </div>

      <div className="mybookings-summary-cards">
        <div className="mybookings-summary-card">
          <div className="mybookings-summary-icon mybookings-icon-calendar">
            <i className="fas fa-calendar"></i>
          </div>
          <div className="mybookings-summary-content">
            <div className="mybookings-summary-value">{totalBookings}</div>
            <div className="mybookings-summary-label">Total Bookings</div>
          </div>
        </div>
        <div className="mybookings-summary-card">
          <div className="mybookings-summary-icon mybookings-icon-completed">
            <i className="fas fa-star"></i>
          </div>
          <div className="mybookings-summary-content">
            <div className="mybookings-summary-value">{completedBookings}</div>
            <div className="mybookings-summary-label">Completed</div>
          </div>
        </div>
      </div>

      <div className="mybookings-filters">
        <div className="mybookings-search-bar">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by mechanic, service, or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="button" className="mybookings-filter-btn" aria-label="Filters">
          <i className="fas fa-filter"></i>
        </button>
        <select
          className="mybookings-status-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">On the way</option>
          <option value="mechanic_arrived">Mechanic arrived</option>
          <option value="arrival_confirmed">Meet confirmed</option>
          <option value="in_progress">In progress</option>
          <option value="completion_pending">Confirm completion</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="mybookings-list">
        {filteredBookings.length === 0 ? (
          <div className="mybookings-empty">
            <i className="fas fa-calendar-times"></i>
            <p>No bookings found</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const bid = booking.id || booking._id;
            const mechanicLabel = booking.mechanic_name || booking.business_name;
            return (
              <div key={bid} className="mybookings-booking-card">
                <div className="mybookings-booking-left">
                  <div className="mybookings-avatar mybookings-avatar-orange">
                    {booking.mechanic_profile_picture ? (
                      <img src={booking.mechanic_profile_picture} alt={mechanicLabel || ''} />
                    ) : (
                      <span>{getMechanicInitials(mechanicLabel)}</span>
                    )}
                  </div>
                  <div className="mybookings-booking-info">
                    <div className="mybookings-mechanic-name">
                      <h3>{mechanicLabel}</h3>
                      <div className="mybookings-mechanic-rating">
                        <i className="fas fa-star"></i>
                        <span>
                          {booking.rating != null ? parseFloat(booking.rating).toFixed(1) : '—'}
                        </span>
                        <span className="mybookings-mechanic-rating-hint">shop avg.</span>
                      </div>
                    </div>
                    <p className="mybookings-service-type">
                      {booking.service_type?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) ||
                        'Service'}
                    </p>
                    <div className="mybookings-booking-details">
                      <div className="mybookings-detail-item">
                        <i className="fas fa-car"></i>
                        <span>
                          {booking.vehicle_brand}{' '}
                          {booking.vehicle_type
                            ? booking.vehicle_type.charAt(0).toUpperCase() + booking.vehicle_type.slice(1)
                            : ''}
                        </span>
                      </div>
                      <div className="mybookings-detail-item">
                        <i className="fas fa-calendar"></i>
                        <span>{formatDate(booking.created_at || booking.scheduled_date)}</span>
                      </div>
                      <div className="mybookings-detail-item">
                        <i className="fas fa-clock"></i>
                        <span>{formatTime(booking.created_at || booking.scheduled_date)}</span>
                      </div>
                    </div>
                    <div className="mybookings-booking-id">
                      Booking ID:{' '}
                      {booking.id?.substring(0, 12).toUpperCase() ||
                        booking._id?.toString().substring(0, 12).toUpperCase() ||
                        'N/A'}
                    </div>
                  </div>
                </div>
                <div className="mybookings-booking-right">
                  <div className="mybookings-booking-status">
                    <span className={`mybookings-status-badge ${getStatusBadgeClass(booking.status)}`}>
                      {labelForStatus(booking.status)}
                    </span>
                  </div>

                  {booking.status === 'completed' && (
                    <div className="mybookings-user-rating">
                      {booking.my_review ? (
                        <>
                          <span className="mybookings-rating-label">Your rating</span>
                          <div className="mybookings-rating-row">
                            <StarDisplay rating={booking.my_review.rating} size="md" />
                            <span className="mybookings-rating-num">
                              {Number(booking.my_review.rating).toFixed(1)} / 5
                            </span>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="mybookings-rate-btn"
                          onClick={() => setRateModalBooking(booking)}
                        >
                          <i className="fas fa-star-half-alt" />
                          Add rating
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mybookings-booking-actions">
                    <button
                      type="button"
                      className="mybookings-action-btn mybookings-action-contact mybookings-msg-btn"
                      disabled={!isBookingChatAllowed(booking.status)}
                      title={
                        isBookingChatAllowed(booking.status)
                          ? 'Open messages'
                          : 'Chat unavailable for cancelled or rejected bookings'
                      }
                      onClick={() => {
                        if (isBookingChatAllowed(booking.status)) navigate(`/chat/${bid}`);
                      }}
                    >
                      <i className="fas fa-comment"></i>
                      Messages
                      {isBookingChatAllowed(booking.status) && chatUnreadForBooking(bid) > 0 && (
                        <span className="mybookings-msg-badge">
                          {chatUnreadForBooking(bid) > 99 ? '99+' : chatUnreadForBooking(bid)}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="mybookings-action-btn mybookings-action-details"
                      onClick={() => navigate(`/track-booking/${bid}`)}
                    >
                      View details <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyBookings;
