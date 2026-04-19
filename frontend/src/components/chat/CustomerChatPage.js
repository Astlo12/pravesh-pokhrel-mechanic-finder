import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getBooking } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isBookingChatAllowed } from '../../utils/bookingChat';
import BookingChatPanel from './BookingChatPanel';
import './CustomerChatPage.css';

const CustomerChatPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [peerLabel, setPeerLabel] = useState('');
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (user?.user_type !== 'customer') {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!bookingId) {
      navigate('/my-bookings', { replace: true });
      return;
    }
    let cancelled = false;
    getBooking(bookingId)
      .then(({ data }) => {
        if (cancelled) return;
        if (!isBookingChatAllowed(data.status)) {
          setBlocked(true);
          return;
        }
        const name = data.mechanic_name || data.business_name || 'Mechanic';
        setPeerLabel(name);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) navigate('/my-bookings', { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, user?.user_type, navigate]);

  if (blocked) {
    return (
      <div className="ccp-page">
        <div className="ccp-card ccp-card--narrow">
          <h1>Chat unavailable</h1>
          <p>Messaging is not available for cancelled or rejected bookings.</p>
          <Link to="/my-bookings" className="ccp-btn">
            Back to bookings
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="ccp-page ccp-loading">
        <i className="fas fa-spinner fa-spin" aria-hidden /> Loading…
      </div>
    );
  }

  return (
    <div className="ccp-page">
      <Link to="/my-bookings" className="ccp-back">
        <i className="fas fa-arrow-left" /> My bookings
      </Link>
      <header className="ccp-header">
        <h1>Messages</h1>
        <p>Chat in real time about this booking.</p>
      </header>
      <BookingChatPanel bookingId={bookingId} peerLabel={peerLabel} />
    </div>
  );
};

export default CustomerChatPage;
