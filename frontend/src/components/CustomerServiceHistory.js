import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomerBookings } from '../services/api';
import { labelForStatus } from '../utils/bookingFlow';
import './css/CustomerServiceHistory.css';

const CustomerServiceHistory = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCustomerBookings();
        setBookings(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completed = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'completed')
        .sort((a, b) => new Date(b.completed_at || b.updated_at || b.created_at) - new Date(a.completed_at || a.updated_at || a.created_at)),
    [bookings]
  );

  if (loading) {
    return (
      <div className="csh-page csh-loading">
        <i className="fas fa-spinner fa-spin" /> Loading history…
      </div>
    );
  }

  return (
    <div className="csh-page">
      <button type="button" className="csh-back" onClick={() => navigate('/dashboard')}>
        <i className="fas fa-arrow-left" /> Back to dashboard
      </button>

      <header className="csh-header">
        <h1>Service history</h1>
        <p>
          Bookings you’ve fully confirmed as complete. Details stay here for your records — use <strong>Track</strong>{' '}
          on active jobs from <Link to="/my-bookings">My bookings</Link>.
        </p>
      </header>

      {completed.length === 0 ? (
        <div className="csh-empty">
          <i className="fas fa-clipboard-list" />
          <p>No completed services yet.</p>
          <Link to="/mechanics" className="csh-btn csh-btn--primary">
            Find a mechanic
          </Link>
        </div>
      ) : (
        <ul className="csh-list">
          {completed.map((b) => {
            const id = b.id || b._id;
            return (
              <li key={id} className="csh-card">
                <div className="csh-card-top">
                  <div>
                    <h2>{b.mechanic_name || b.business_name || 'Mechanic'}</h2>
                    <span className="csh-badge">{labelForStatus(b.status)}</span>
                  </div>
                  <span className="csh-ref">{String(id).slice(0, 8).toUpperCase()}</span>
                </div>
                <dl className="csh-dl">
                  <div>
                    <dt>Service</dt>
                    <dd>{(b.service_type || '').replace(/_/g, ' ') || '—'}</dd>
                  </div>
                  <div>
                    <dt>Vehicle</dt>
                    <dd>
                      {[b.vehicle_brand, b.vehicle_type].filter(Boolean).join(' · ') || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Booked</dt>
                    <dd>{b.created_at ? new Date(b.created_at).toLocaleString() : '—'}</dd>
                  </div>
                  {b.mechanic_arrived_at && (
                    <div>
                      <dt>Mechanic arrived</dt>
                      <dd>{new Date(b.mechanic_arrived_at).toLocaleString()}</dd>
                    </div>
                  )}
                  {b.service_started_at && (
                    <div>
                      <dt>Service started</dt>
                      <dd>{new Date(b.service_started_at).toLocaleString()}</dd>
                    </div>
                  )}
                  {b.mechanic_marked_complete_at && (
                    <div>
                      <dt>Work finished (mechanic)</dt>
                      <dd>{new Date(b.mechanic_marked_complete_at).toLocaleString()}</dd>
                    </div>
                  )}
                  {b.completed_at && (
                    <div>
                      <dt>You confirmed complete</dt>
                      <dd>{new Date(b.completed_at).toLocaleString()}</dd>
                    </div>
                  )}
                  {b.address && (
                    <div className="csh-dl-full">
                      <dt>Location</dt>
                      <dd>{b.address}</dd>
                    </div>
                  )}
                  {b.issue_description && (
                    <div className="csh-dl-full">
                      <dt>Issue / notes</dt>
                      <dd>{b.issue_description}</dd>
                    </div>
                  )}
                </dl>
                <div className="csh-card-actions">
                  <Link to={`/track-booking/${id}`} className="csh-btn csh-btn--outline">
                    View summary
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CustomerServiceHistory;
