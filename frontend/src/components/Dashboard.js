import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCustomerBookings, getUserProfile, getUnreadNotificationCount } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useChatUnread } from '../context/ChatUnreadContext';
import MechanicDashboard from './MechanicDashboard';
import {
  ACTIVE_CUSTOMER_STATUSES,
  BOOKING_STATUS_LABELS,
  CUSTOMER_STATUS_DESCRIPTIONS,
  ETA_LIVE_STATUSES,
  MAP_LIVE_STATUSES,
  HISTORY_STATUSES,
  labelForStatus,
} from '../utils/bookingFlow';
import { isBookingChatAllowed } from '../utils/bookingChat';
import './css/Dashboard.css';

/** Safe km display — socket/API may send strings */
const formatDistanceKm = (value) => {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n.toFixed(1) : null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const { countForBooking: chatUnreadForBooking } = useChatUnread();
  const [bookings, setBookings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState({});
  const [distance, setDistance] = useState({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const bookingsResponse = await getCustomerBookings();
      const profileResponse = await getUserProfile();
      setUserProfile(profileResponse.data);
      setBookings(bookingsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_type === 'mechanic') {
      setLoading(false);
      return;
    }
    if (user?.user_type === 'customer') {
      fetchData();
    } else if (user) {
      setLoading(false);
    }
  }, [user?.user_type, user, fetchData]);

  useEffect(() => {
    if (socket) {
      socket.on('booking:eta-update', (data) => {
        setEta(prev => ({ ...prev, [data.bookingId]: data.eta }));
        if (data.distance != null && data.distance !== '') {
          const km = typeof data.distance === 'number' ? data.distance : parseFloat(data.distance);
          if (Number.isFinite(km)) {
            setDistance(prev => ({ ...prev, [data.bookingId]: km }));
          }
        }
      });

      return () => {
        socket.off('booking:eta-update');
      };
    }
  }, [socket]);

  useEffect(() => {
    if (user?.user_type !== 'customer') return;
    const loadUnread = async () => {
      try {
        const { data } = await getUnreadNotificationCount();
        setUnreadNotifications(typeof data?.count === 'number' ? data.count : 0);
      } catch {
        setUnreadNotifications(0);
      }
    };
    loadUnread();
    const t = setInterval(loadUnread, 60000);
    return () => clearInterval(t);
  }, [user?.user_type]);

  useEffect(() => {
    if (user?.user_type !== 'customer' || !socket) return;
    const onRefresh = () => {
      getUnreadNotificationCount()
        .then(({ data }) => {
          setUnreadNotifications(typeof data?.count === 'number' ? data.count : 0);
        })
        .catch(() => {});
    };
    socket.on('notifications:refresh', onRefresh);
    return () => socket.off('notifications:refresh', onRefresh);
  }, [user?.user_type, socket]);

  const bookingKey = (b) => b?.id || (b?._id != null ? String(b._id) : '');

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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

  const getStatusBadgeClass = (status) => {
    if (['accepted', 'mechanic_arrived', 'arrival_confirmed', 'in_progress'].includes(status)) {
      return 'dashboard-status-onway';
    }
    if (status === 'completion_pending') return 'dashboard-status-pending';
    const statusMap = {
      pending: 'dashboard-status-pending',
      completed: 'dashboard-status-completed',
      cancelled: 'dashboard-status-cancelled',
      rejected: 'dashboard-status-cancelled',
    };
    return statusMap[status] || 'dashboard-status-pending';
  };

  const getStatusText = (status) =>
    BOOKING_STATUS_LABELS[status] || labelForStatus(status);

  const calculateProgress = (booking) => {
    const steps = {
      pending: 12,
      accepted: 28,
      mechanic_arrived: 42,
      arrival_confirmed: 52,
      in_progress: 68,
      completion_pending: 88,
      completed: 100,
    };
    return steps[booking.status] ?? 0;
  };

  // Memoized values - must be called before any conditional returns
  const activeBooking = useMemo(() => {
    const active = bookings.filter((b) => ACTIVE_CUSTOMER_STATUSES.includes(b.status));
    if (active.length === 0) return undefined;
    return active.sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
    )[0];
  }, [bookings]);

  const recentBookings = useMemo(
    () =>
      bookings
        .filter((b) => HISTORY_STATUSES.includes(b.status))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3),
    [bookings]
  );
  const vehicles = userProfile?.vehicle_models || [];
  const activeBookingDistanceLabel = useMemo(() => {
    if (!activeBooking) return 'N/A';
    const id = bookingKey(activeBooking);
    const d = formatDistanceKm(distance[id]);
    return d != null ? `${d} km` : 'N/A';
  }, [activeBooking, distance]);

  // Calculate distance for active booking - must be called before conditional returns
  useEffect(() => {
    if (user?.user_type === 'customer' && activeBooking && activeBooking.customer_latitude && activeBooking.mechanic_current_latitude) {
      const dist = calculateDistance(
        activeBooking.customer_latitude,
        activeBooking.customer_longitude,
        activeBooking.mechanic_current_latitude,
        activeBooking.mechanic_current_longitude
      );
      if (dist !== null) {
        const id = bookingKey(activeBooking);
        setDistance((prev) => ({ ...prev, [id]: dist }));
      }
    }
  }, [activeBooking, user?.user_type]);

  // Join booking room so live ETA / distance broadcasts reach the dashboard (same as tracking page)
  useEffect(() => {
    if (!socket || user?.user_type !== 'customer' || !activeBooking) return;
    const id = bookingKey(activeBooking);
    if (!id) return;
    socket.emit('booking:join', { bookingId: id });
  }, [socket, user?.user_type, activeBooking]);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (user?.user_type === 'mechanic') {
    return <MechanicDashboard />;
  }

  if (user?.user_type === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user?.user_type !== 'customer') {
    return <Navigate to="/" replace />;
  }

  const activeId = activeBooking ? bookingKey(activeBooking) : null;
  const showLiveEta =
    activeBooking && ETA_LIVE_STATUSES.includes(activeBooking.status);
  const showDistance =
    activeBooking && MAP_LIVE_STATUSES.includes(activeBooking.status);
  const statusSubtitle =
    (activeBooking && CUSTOMER_STATUS_DESCRIPTIONS[activeBooking.status]) ||
    'Track your service below.';

  return (
      <div className="dashboard-container dashboard-customer">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <h1 className="dashboard-welcome-text">
              Welcome back, {user.name?.split(' ')[0] || 'User'}! <span role="img" aria-label="wave">👋</span>
            </h1>
            <p className="dashboard-subtitle">Manage your bookings and find mechanics nearby.</p>
          </div>
          <div className="dashboard-header-right">
            <button
              type="button"
              className="dashboard-icon-btn dashboard-notification-btn"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
              <i className="fas fa-bell"></i>
              {unreadNotifications > 0 && (
                <span className="dashboard-notification-badge">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
            <button
              type="button"
              className="dashboard-icon-btn"
              onClick={() => navigate('/profile')}
              aria-label="Profile settings"
            >
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="dashboard-left-column">
            {/* Active Booking Card */}
            <div className="dashboard-active-booking">
              {activeBooking ? (
                <>
                  <div className="dashboard-card-header">
                    <div className="dashboard-card-title">
                      <span className="dashboard-dot dashboard-dot-orange"></span>
                      <h2>Active Booking</h2>
                    </div>
                    <span className={`dashboard-status-badge ${getStatusBadgeClass(activeBooking.status)}`}>
                      {getStatusText(activeBooking.status)}
                    </span>
                  </div>

                  <div className="dashboard-booking-content">
                    <div className="dashboard-mechanic-info">
                      <div className="dashboard-avatar dashboard-avatar-orange">
                        {activeBooking.mechanic_profile_picture ? (
                          <img
                            src={activeBooking.mechanic_profile_picture}
                            alt={activeBooking.mechanic_name}
                          />
                        ) : (
                          <span>{getMechanicInitials(activeBooking.mechanic_name || activeBooking.business_name)}</span>
                        )}
                      </div>
                      <div className="dashboard-mechanic-details">
                        <h3>{activeBooking.mechanic_name || activeBooking.business_name}</h3>
                        <div className="dashboard-rating">
                          <i className="fas fa-star"></i>
                          <span>{activeBooking.rating ? parseFloat(activeBooking.rating).toFixed(1) : 'N/A'}</span>
                        </div>
                        <p className="dashboard-service-type">
                          {activeBooking.service_type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Service'}
                        </p>
                        <p className="dashboard-status-text">{statusSubtitle}</p>
                      </div>
                    </div>

                    <div className="dashboard-progress-section">
                      <div className="dashboard-progress-bar">
                        <div
                          className="dashboard-progress-fill"
                          style={{ width: `${calculateProgress(activeBooking)}%` }}
                        ></div>
                      </div>
                      <div className="dashboard-booking-meta">
                        <div className="dashboard-meta-item">
                          <span className="dashboard-meta-label">ETA:</span>
                          <span className="dashboard-meta-value">
                            {showLiveEta
                              ? `${eta[activeId] ?? activeBooking.estimated_eta ?? '—'} min`
                              : '—'}
                          </span>
                        </div>
                        <div className="dashboard-meta-item">
                          <span className="dashboard-meta-label">Distance:</span>
                          <span className="dashboard-meta-value">
                            {showDistance ? activeBookingDistanceLabel : '—'}
                          </span>
                        </div>
                        <div className="dashboard-meta-item">
                          <span className="dashboard-meta-label">Booking ID:</span>
                          <span className="dashboard-meta-value">
                            {(activeId || '').substring(0, 8).toUpperCase() || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="dashboard-booking-actions">
                      <button
                        type="button"
                        className="dashboard-btn-primary"
                        onClick={() => navigate(`/track-booking/${activeId}`)}
                      >
                        <i className="fas fa-paper-plane"></i>
                        Track Live
                      </button>
                      <div className="dashboard-action-buttons">
                        {activeBooking.mechanic_phone ? (
                          <a
                            className="dashboard-btn-icon"
                            href={`tel:${activeBooking.mechanic_phone}`}
                            title="Call mechanic"
                          >
                            <i className="fas fa-phone"></i>
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="dashboard-btn-icon"
                            title="Phone not available"
                            disabled
                            style={{ opacity: 0.45, cursor: 'not-allowed' }}
                          >
                            <i className="fas fa-phone"></i>
                          </button>
                        )}
                        <button
                          type="button"
                          className="dashboard-btn-icon dashboard-msg-icon-wrap"
                          title={
                            isBookingChatAllowed(activeBooking.status)
                              ? 'Message mechanic'
                              : 'Chat unavailable for this booking'
                          }
                          disabled={!isBookingChatAllowed(activeBooking.status)}
                          style={
                            !isBookingChatAllowed(activeBooking.status)
                              ? { opacity: 0.45, cursor: 'not-allowed' }
                              : undefined
                          }
                          onClick={() => {
                            if (activeId && isBookingChatAllowed(activeBooking.status)) {
                              navigate(`/chat/${activeId}`);
                            }
                          }}
                        >
                          <i className="fas fa-comment"></i>
                          {activeId && chatUnreadForBooking(activeId) > 0 && (
                            <span className="dashboard-msg-badge">
                              {chatUnreadForBooking(activeId) > 99 ? '99+' : chatUnreadForBooking(activeId)}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="dashboard-no-active-booking">
                  <div className="dashboard-no-active-icon">
                    <i className="fas fa-calendar-times"></i>
                  </div>
                  <h3>No Active Booking</h3>
                  <p>You don't have any active bookings at the moment.</p>
                  <button
                    type="button"
                    className="dashboard-btn-primary"
                    onClick={() => navigate('/mechanics')}
                  >
                    <i className="fas fa-search"></i>
                    Find a Mechanic
                  </button>
                </div>
              )}
            </div>

            {/* Feature Cards */}
            <div className="dashboard-feature-cards">
              <div
                className="dashboard-feature-card"
                onClick={() => navigate('/my-bookings')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/my-bookings');
                  }
                }}
              >
                <i className="fas fa-calendar"></i>
                <span>My Bookings</span>
              </div>
              <div
                className="dashboard-feature-card"
                onClick={() => navigate('/service-history')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/service-history');
                  }
                }}
              >
                <i className="fas fa-history"></i>
                <span>Service History</span>
              </div>
              <div
                className="dashboard-feature-card"
                onClick={() => navigate('/notifications')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/notifications');
                  }
                }}
              >
                <i className="fas fa-bell"></i>
                <span>Notifications</span>
              </div>

            </div>
          </div>

          {/* Right Column */}
          <div className="dashboard-right-column">
            {/* My Vehicles */}
            <div className="dashboard-vehicles">
              <div className="dashboard-section-header">
                <h3>
                  <i className="fas fa-car"></i>
                  My Vehicles
                </h3>
                <button
                  type="button"
                  className="dashboard-add-btn"
                  onClick={() => navigate('/profile')}
                  title="Add Vehicle"
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              <div className="dashboard-vehicles-list">
                {vehicles.length === 0 ? (
                  <p className="dashboard-empty">No vehicles added yet</p>
                ) : (
                  vehicles.map((vehicle, index) => (
                    <div key={index} className="dashboard-vehicle-item">
                      <i className="fas fa-car"></i>
                      <div className="dashboard-vehicle-info">
                        <h4>{vehicle.brand} {vehicle.model}</h4>
                        <p>{vehicle.type?.charAt(0).toUpperCase() + vehicle.type?.slice(1)}</p>
                      </div>
                      <span className="dashboard-vehicle-badge">{vehicle.type?.toUpperCase() || 'VEHICLE'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="dashboard-recent-bookings">
              <div className="dashboard-section-header">
                <h3>
                  <i className="fas fa-history"></i>
                  Recent Bookings
                </h3>
                <button
                  type="button"
                  className="dashboard-view-all"
                  onClick={() => navigate('/my-bookings')}
                >
                  View All <i className="fas fa-chevron-right"></i>
                </button>
              </div>
              <div className="dashboard-recent-list">
                {recentBookings.length === 0 ? (
                  <p className="dashboard-empty">No recent bookings</p>
                ) : (
                  recentBookings.map((booking) => (
                    <div key={bookingKey(booking)} className="dashboard-recent-item">
                      <div className="dashboard-avatar dashboard-avatar-gray">
                        {booking.mechanic_profile_picture ? (
                          <img
                            src={booking.mechanic_profile_picture}
                            alt={booking.mechanic_name}
                          />
                        ) : (
                          <span>{getMechanicInitials(booking.mechanic_name || booking.business_name)}</span>
                        )}
                      </div>
                      <div className="dashboard-recent-info">
                        <h4>{booking.mechanic_name || booking.business_name}</h4>
                        <p>
                          {booking.service_type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Service'} • {formatDate(booking.created_at)}
                        </p>
                      </div>
                      <div className="dashboard-recent-right">
                        <div className="dashboard-rating-small">
                          <i className="fas fa-star"></i>
                          <span>{booking.rating ? parseFloat(booking.rating).toFixed(1) : 'N/A'}</span>
                        </div>
                        <span className={`dashboard-status-badge-small ${getStatusBadgeClass(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
};

export default Dashboard;
