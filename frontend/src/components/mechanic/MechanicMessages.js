import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { getMechanicBookings } from '../../services/api';
import { isBookingChatAllowed } from '../../utils/bookingChat';
import { useChatUnread } from '../../context/ChatUnreadContext';
import BookingChatPanel from '../chat/BookingChatPanel';
import './css/MechanicWorkspace.css';

const statusIcon = (s) => {
  if (s === 'pending') return 'fa-inbox';
  if (s === 'accepted') return 'fa-check';
  if (s === 'in_progress') return 'fa-wrench';
  if (s === 'completed') return 'fa-flag-checkered';
  return 'fa-info-circle';
};

const MechanicMessages = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { countForBooking: chatUnreadForBooking } = useChatUnread();
  const [tab, setTab] = useState('messages');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getMechanicBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chatBookings = useMemo(
    () =>
      [...bookings]
        .filter((b) => isBookingChatAllowed(b.status))
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
        ),
    [bookings]
  );

  useEffect(() => {
    const fromNav = location.state?.bookingId;
    if (fromNav) {
      setSelectedBookingId(String(fromNav));
      setTab('messages');
    }
  }, [location.state?.bookingId]);

  useEffect(() => {
    const q = searchParams.get('booking');
    if (q && /^[0-9a-fA-F]{24}$/.test(q)) {
      setSelectedBookingId(q);
      setTab('messages');
    }
  }, [searchParams]);

  useEffect(() => {
    if (location.state?.bookingId) return;
    setSelectedBookingId((prev) => {
      if (prev != null) return prev;
      if (!chatBookings.length) return null;
      return String(chatBookings[0].id || chatBookings[0]._id);
    });
  }, [chatBookings, location.state?.bookingId]);

  const activity = [...bookings]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 40);

  const selectedBooking = chatBookings.find(
    (b) => String(b.id || b._id) === String(selectedBookingId)
  );
  const peerLabel = selectedBooking
    ? selectedBooking.customer_name || 'Customer'
    : '';

  if (loading) {
    return (
      <div className="mechws-page mechws-loading">
        <i className="fas fa-spinner fa-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mechws-page mechws-page-wide">
      <Link to="/dashboard" className="mechws-back">
        <i className="fas fa-arrow-left" /> Back to dashboard
      </Link>
      <header className="mechws-header">
        <h1>Messages &amp; activity</h1>
        <p>Chat with customers in real time on active jobs. Booking history stays under Activity.</p>
      </header>

      <div className="mechws-tabs">
        <button
          type="button"
          className={`mechws-tab ${tab === 'activity' ? 'mechws-tab--active' : ''}`}
          onClick={() => setTab('activity')}
        >
          <i className="fas fa-stream" /> Activity
        </button>
        <button
          type="button"
          className={`mechws-tab ${tab === 'messages' ? 'mechws-tab--active' : ''}`}
          onClick={() => setTab('messages')}
        >
          <i className="fas fa-comments" /> Messages
        </button>
      </div>

      {tab === 'activity' && (
        <div className="mechws-card">
          <div className="mechws-card-header">
            <i className="fas fa-history" /> Recent booking events
          </div>
          <div className="mechws-card-body">
            {activity.length === 0 ? (
              <div className="mechws-placeholder" style={{ border: 'none' }}>
                <i className="fas fa-calendar-alt" />
                <p>No bookings yet.</p>
              </div>
            ) : (
              activity.map((b) => (
                <div key={b.id || b._id} className="mechws-activity-item">
                  <div className="mechws-activity-icon">
                    <i className={`fas ${statusIcon(b.status)}`} />
                  </div>
                  <div>
                    <strong>{b.customer_name || 'Customer'}</strong>
                    <span style={{ color: '#6c757d', marginLeft: 8 }}>
                      · {(b.service_type || '').replace(/_/g, ' ')}
                    </span>
                    <div style={{ fontSize: '0.88rem', color: '#495057', marginTop: 4 }}>
                      Status: <strong>{b.status?.replace(/_/g, ' ')}</strong>
                      {b.created_at && (
                        <span style={{ color: '#6c757d', marginLeft: 8 }}>
                          {new Date(b.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="mechws-chat-shell">
          <aside className="mechws-chat-sidebar" aria-label="Bookings with chat">
            <div className="mechws-chat-sidebar-head">Conversations</div>
            {chatBookings.length === 0 ? (
              <div className="mechws-chat-sidebar-empty">
                <p>No active chats.</p>
                <p className="mechws-chat-sidebar-hint">
                  Chats are available for all bookings except cancelled or rejected.
                </p>
              </div>
            ) : (
              <ul className="mechws-chat-thread-list">
                {chatBookings.map((b) => {
                  const id = String(b.id || b._id);
                  const active = id === String(selectedBookingId);
                  const unread = chatUnreadForBooking(id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className={`mechws-chat-thread ${active ? 'mechws-chat-thread--active' : ''}`}
                        onClick={() => setSelectedBookingId(id)}
                      >
                        <span className="mechws-chat-thread-top">
                          <span className="mechws-chat-thread-name">{b.customer_name || 'Customer'}</span>
                          {unread > 0 && (
                            <span className="mechws-chat-thread-badge">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </span>
                        <span className="mechws-chat-thread-meta">
                          {(b.service_type || '').replace(/_/g, ' ')} · {b.status?.replace(/_/g, ' ')}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
          <div className="mechws-chat-main">
            {selectedBookingId && selectedBooking ? (
              <BookingChatPanel
                bookingId={selectedBookingId}
                peerLabel={peerLabel}
                embedded
              />
            ) : (
              <div className="mechws-chat-placeholder">
                <i className="fas fa-comments" />
                <p>Select a booking to open chat.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MechanicMessages;
