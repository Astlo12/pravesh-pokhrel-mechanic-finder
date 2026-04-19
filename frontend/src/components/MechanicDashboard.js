import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMechanicBookings,
  getMechanicProfileId,
  getMechanicProfile,
  updateBookingStatus,
  setMechanicOnline,
  updateMechanicAvailability,
} from '../services/api';
import { useSocket } from '../context/SocketContext';
import './css/MechanicDashboard.css';

const formatWorkingHours = (workingTime) => {
  if (!workingTime) return 'Not set — update your public profile';
  if (typeof workingTime === 'string') return workingTime;
  if (workingTime.start && workingTime.end) {
    return `${workingTime.start} – ${workingTime.end}`;
  }
  return 'Not set — update your public profile';
};

const statusLabel = (status) => {
  const map = {
    pending: 'Pending',
    accepted: 'En route',
    mechanic_arrived: 'Arrived (confirm)',
    arrival_confirmed: 'Ready to start',
    in_progress: 'In progress',
    completion_pending: 'Awaiting customer OK',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
  };
  return map[status] || status?.replace(/_/g, ' ') || '—';
};

const ACTIVE_JOB_STATUSES = [
  'accepted',
  'mechanic_arrived',
  'arrival_confirmed',
  'in_progress',
  'completion_pending',
];

const MechanicDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  const [mechanicId, setMechanicId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [etaByBooking, setEtaByBooking] = useState({});
  const [toggleBusy, setToggleBusy] = useState({ online: false, available: false });

  const loadData = useCallback(async () => {
    try {
      const idRes = await getMechanicProfileId();
      const id = idRes.data.mechanicId;
      setMechanicId(id);

      const [profRes, bookRes] = await Promise.all([
        getMechanicProfile(id),
        getMechanicBookings(),
      ]);
      setProfile(profRes.data);
      setBookings(Array.isArray(bookRes.data) ? bookRes.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!socket) return;
    const onEta = (data) => {
      if (data.bookingId == null || data.eta == null) return;
      setEtaByBooking((prev) => ({ ...prev, [data.bookingId]: data.eta }));
    };
    socket.on('booking:eta-update', onEta);
    return () => socket.off('booking:eta-update', onEta);
  }, [socket]);

  // Join active booking rooms so live ETA broadcasts reach the mechanic dashboard
  useEffect(() => {
    if (!socket || !bookings.length) return;
    bookings.forEach((b) => {
      if (ACTIVE_JOB_STATUSES.includes(b.status)) {
        const bid = b.id || b._id;
        if (bid) socket.emit('booking:join', { bookingId: bid });
      }
    });
  }, [socket, bookings]);

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const active = bookings.filter((b) => ACTIVE_JOB_STATUSES.includes(b.status)).length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    return { pending, active, completed, total: bookings.length };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (tab === 'pending') return bookings.filter((b) => b.status === 'pending');
    if (tab === 'active') {
      return bookings.filter((b) => ACTIVE_JOB_STATUSES.includes(b.status));
    }
    if (tab === 'history') {
      return bookings.filter((b) =>
        ['completed', 'cancelled', 'rejected'].includes(b.status)
      );
    }
    return bookings;
  }, [bookings, tab]);

  const sortedJobs = useMemo(() => {
    return [...filteredBookings].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [filteredBookings]);

  const insights = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = bookings.filter(
      (b) =>
        b.status === 'completed' &&
        b.created_at &&
        new Date(b.created_at) >= startMonth
    ).length;
    return { completedThisMonth };
  }, [bookings]);

  const achievements = useMemo(() => {
    const list = [];
    const rating = profile?.rating != null ? parseFloat(profile.rating) : 0;
    const nRev = profile?.total_reviews ?? 0;
    const done = stats.completed;

    if (profile?.is_verified) {
      list.push({
        id: 'ver',
        title: 'Verified pro',
        desc: 'Listed on Find Mechanics',
        icon: 'fa-shield-alt',
      });
    }
    if (done >= 1) {
      list.push({ id: 'j1', title: 'First fix', desc: 'Completed a job', icon: 'fa-star' });
    }
    if (done >= 5) {
      list.push({ id: 'j5', title: 'Rising star', desc: '5+ completed jobs', icon: 'fa-chart-line' });
    }
    if (done >= 25) {
      list.push({ id: 'j25', title: 'Trusted hands', desc: '25+ completed jobs', icon: 'fa-award' });
    }
    if (rating >= 4.5 && nRev >= 3) {
      list.push({ id: 'top', title: 'Top rated', desc: '4.5+ avg with 3+ reviews', icon: 'fa-trophy' });
    }
    return list;
  }, [profile, stats.completed]);

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      await updateBookingStatus(bookingId, { status });
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Could not update booking');
    }
  };

  const onToggleOnline = async (next) => {
    if (!mechanicId) return;
    setToggleBusy((b) => ({ ...b, online: true }));
    try {
      await setMechanicOnline(mechanicId, next);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Could not update online status');
    } finally {
      setToggleBusy((b) => ({ ...b, online: false }));
    }
  };

  const onToggleAvailable = async (next) => {
    if (!mechanicId) return;
    setToggleBusy((b) => ({ ...b, available: true }));
    try {
      await updateMechanicAvailability(mechanicId, { is_available: next });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Could not update availability');
    } finally {
      setToggleBusy((b) => ({ ...b, available: false }));
    }
  };

  const initials = (name) => {
    if (!name) return '?';
    const p = name.trim().split(/\s+/);
    if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="mechdash-page">
        <div className="mechdash-loading">
          <i className="fas fa-spinner fa-spin" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  const business = profile?.business_name || 'Your workshop';
  const isOnline = !!profile?.is_online;
  const isAvailable = profile?.is_available !== false;
  const isVerified = !!profile?.is_verified;

  /** Unverified mechanics cannot take new requests; may still finish existing active jobs */
  const canRespondToNewRequests = isVerified;
  const canManageActiveJob = (booking) =>
    isVerified || ACTIVE_JOB_STATUSES.includes(booking.status);

  return (
    <div className="mechdash-page">
      {!isVerified && (
        <div className="mechdash-verification-banner" role="status">
          <div className="mechdash-verification-banner-icon">
            <i className="fas fa-user-shield" />
          </div>
          <div className="mechdash-verification-banner-text">
            <strong>Your profile is pending admin verification</strong>
            <p>
              You can complete your public profile, but you will <strong>not</strong> appear in Find Mechanics
              search, go online for customers, or accept new jobs until an administrator verifies your account.
              You’ll get full workspace access as soon as verification is complete.
            </p>
          </div>
        </div>
      )}

      <header className="mechdash-header">
        <div className="mechdash-header-main">
          <h1>Mechanic workspace</h1>
          <p>
            Welcome back, <strong>{user?.name?.split(' ')[0] || 'mechanic'}</strong> · {business}
          </p>
        </div>
        <div className="mechdash-header-actions">
          {mechanicId && (
            <Link to={`/mechanic/${mechanicId}`} className="mechdash-btn">
              <i className="fas fa-external-link-alt" />
              Public profile
            </Link>
          )}
          {isVerified ? (
            <Link to="/mechanics" className="mechdash-btn mechdash-btn--primary" title="Preview the customer search page">
              <i className="fas fa-search" />
              How customers see search
            </Link>
          ) : (
            <span
              className="mechdash-btn mechdash-btn--primary mechdash-btn--disabled"
              title="Available after your profile is verified"
            >
              <i className="fas fa-search" />
              How customers see search
            </span>
          )}
        </div>
      </header>

      <section className="mechdash-stats" aria-label="Summary">
        <div className="mechdash-stat-card">
          <div className="mechdash-stat-value">{stats.pending}</div>
          <div className="mechdash-stat-label">New requests</div>
        </div>
        <div className="mechdash-stat-card">
          <div className="mechdash-stat-value">{stats.active}</div>
          <div className="mechdash-stat-label">Active jobs</div>
        </div>
        <div className="mechdash-stat-card">
          <div className="mechdash-stat-value">{stats.completed}</div>
          <div className="mechdash-stat-label">Completed</div>
        </div>
        <div className="mechdash-stat-card">
          <div className="mechdash-stat-value">{profile?.rating != null ? Number(profile.rating).toFixed(1) : '—'}</div>
          <div className="mechdash-stat-label">Rating</div>
        </div>
      </section>

      <nav className="mechdash-quicknav" aria-label="Workspace pages">
        <Link to="/mechanic/workspace/bookings" className="mechdash-quicknav-item">
          <i className="fas fa-calendar-check" />
          <span>All bookings</span>
        </Link>
        <Link to="/mechanic/workspace/edit-profile" className="mechdash-quicknav-item">
          <i className="fas fa-user-edit" />
          <span>Edit profile</span>
        </Link>
        <Link to="/mechanic/workspace/reviews" className="mechdash-quicknav-item">
          <i className="fas fa-star" />
          <span>Reviews</span>
        </Link>
        <Link to="/mechanic/workspace/history" className="mechdash-quicknav-item">
          <i className="fas fa-history" />
          <span>Service history</span>
        </Link>
        <Link to="/mechanic/workspace/messages" className="mechdash-quicknav-item">
          <i className="fas fa-comments" />
          <span>Messages</span>
        </Link>
      </nav>

      <div className="mechdash-insights-row">
        <div className="mechdash-card mechdash-insights-card">
          <div className="mechdash-card-header">
            <h2>
              <i className="fas fa-chart-bar" />
              Insights
            </h2>
          </div>
          <div className="mechdash-card-body mechdash-insights-body">
            <div>
              <span className="mechdash-insight-value">{insights.completedThisMonth}</span>
              <span className="mechdash-insight-label">Completed this month</span>
            </div>
            <div>
              <span className="mechdash-insight-value">{stats.completed}</span>
              <span className="mechdash-insight-label">Lifetime completed</span>
            </div>
            <div>
              <span className="mechdash-insight-value">{stats.total}</span>
              <span className="mechdash-insight-label">All bookings seen</span>
            </div>
            <div>
              <span className="mechdash-insight-value">{profile?.total_customers ?? 0}</span>
              <span className="mechdash-insight-label">Customers served</span>
            </div>
          </div>
        </div>
        <div className="mechdash-card mechdash-achievements-card">
          <div className="mechdash-card-header">
            <h2>
              <i className="fas fa-medal" />
              Achievements
            </h2>
          </div>
          <div className="mechdash-card-body mechdash-achievements-body">
            {achievements.length === 0 ? (
              <p className="mechdash-achievements-empty">Complete jobs and earn reviews to unlock badges.</p>
            ) : (
              <ul className="mechdash-achievement-list">
                {achievements.map((a) => (
                  <li key={a.id} className="mechdash-achievement-item">
                    <span className="mechdash-achievement-icon">
                      <i className={`fas ${a.icon}`} />
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      <span>{a.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mechdash-grid">
        <div>
          <div className="mechdash-card">
            <div className="mechdash-card-header">
              <h2>
                <i className="fas fa-sliders-h" />
                Availability &amp; presence
              </h2>
            </div>
            <div className="mechdash-card-body">
              <div className="mechdash-toggle-row">
                <div className="mechdash-toggle-info">
                  <strong>Online</strong>
                  <span>
                    {isVerified
                      ? 'When on, you appear in live search and can receive requests.'
                      : 'Unlocks after admin verification — you cannot appear in customer search yet.'}
                  </span>
                </div>
                <label className="mechdash-switch">
                  <input
                    type="checkbox"
                    checked={isOnline}
                    disabled={!isVerified || toggleBusy.online}
                    onChange={(e) => onToggleOnline(e.target.checked)}
                  />
                  <span className="mechdash-switch-slider" />
                </label>
              </div>
              <div className="mechdash-toggle-row">
                <div className="mechdash-toggle-info">
                  <strong>Open for new jobs</strong>
                  <span>
                    {isVerified
                      ? 'Turn off to pause new bookings (you can still finish active jobs).'
                      : 'Available after verification.'}
                  </span>
                </div>
                <label className="mechdash-switch">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    disabled={!isVerified || toggleBusy.available || stats.active > 0}
                    onChange={(e) => onToggleAvailable(e.target.checked)}
                  />
                  <span className="mechdash-switch-slider" />
                </label>
              </div>
            </div>
            <p className="mechdash-hint">
              <i className="fas fa-location-arrow" />
              {isVerified
                ? 'Live GPS updates run while you’re logged in — customers see your position for active jobs and ETA.'
                : 'After verification, live location sharing helps customers track you on active jobs.'}
            </p>
          </div>

          <div className="mechdash-card">
            <div className="mechdash-card-header">
              <h2>
                <i className="fas fa-id-card" />
                Profile snapshot
              </h2>
            </div>
            <div className="mechdash-card-body">
              <ul className="mechdash-meta-list">
                <li>
                  <span>Verification</span>
                  <span>
                    {profile?.is_verified ? (
                      <span className="mechdash-badge mechdash-badge--verified">
                        <i className="fas fa-check-circle" /> Verified
                      </span>
                    ) : (
                      <span className="mechdash-badge mechdash-badge--unverified">
                        <i className="fas fa-hourglass-half" /> Pending
                      </span>
                    )}
                  </span>
                </li>
                <li>
                  <span>Customers served</span>
                  <span>{profile?.total_customers ?? 0}</span>
                </li>
                <li>
                  <span>Reviews</span>
                  <span>{profile?.total_reviews ?? 0}</span>
                </li>
                <li>
                  <span>Service radius</span>
                  <span>{profile?.service_radius != null ? `${profile.service_radius} km` : '—'}</span>
                </li>
                <li>
                  <span>Working hours</span>
                  <span>{formatWorkingHours(profile?.working_time)}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          {!isVerified && (
            <div className="mechdash-job-board-notice">
              <i className="fas fa-info-circle" />
              <span>
                New booking requests are disabled until verification. If you still have an active job from before,
                you can update it below.
              </span>
            </div>
          )}
          <div className="mechdash-board-header">
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#1a1a1a' }}>Job board</h2>
            <div className="mechdash-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={`mechdash-tab ${tab === 'pending' ? 'mechdash-tab--active' : ''}`}
                onClick={() => setTab('pending')}
              >
                New ({stats.pending})
              </button>
              <button
                type="button"
                role="tab"
                className={`mechdash-tab ${tab === 'active' ? 'mechdash-tab--active' : ''}`}
                onClick={() => setTab('active')}
              >
                Active ({stats.active})
              </button>
              <button
                type="button"
                role="tab"
                className={`mechdash-tab ${tab === 'history' ? 'mechdash-tab--active' : ''}`}
                onClick={() => setTab('history')}
              >
                History
              </button>
            </div>
          </div>

          {sortedJobs.length === 0 ? (
            <div className="mechdash-empty">
              <i className="fas fa-inbox" />
              <p>No jobs in this view.</p>
              {tab === 'pending' && (
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  {isVerified
                    ? 'Stay online and available to receive new requests.'
                    : 'After admin verifies your profile, new requests will appear here.'}
                </p>
              )}
            </div>
          ) : (
            <div className="mechdash-job-list">
              {sortedJobs.map((b) => {
                const id = b.id || b._id;
                const liveEta = etaByBooking[id] ?? b.estimated_eta;
                return (
                  <article key={id} className="mechdash-job">
                    <div className="mechdash-job-top">
                      <div className="mechdash-job-customer">
                        <div className="mechdash-job-avatar">
                          {b.customer_profile_picture ? (
                            <img src={b.customer_profile_picture} alt="" />
                          ) : (
                            initials(b.customer_name)
                          )}
                        </div>
                        <div>
                          <h3>{b.customer_name || 'Customer'}</h3>
                          <p>
                            {b.customer_phone && (
                              <>
                                <i className="fas fa-phone" style={{ marginRight: '0.35rem' }} />
                                {b.customer_phone}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={`mechdash-job-status mechdash-job-status--${b.status}`}>
                        {statusLabel(b.status)}
                      </span>
                    </div>

                    <div className="mechdash-job-details">
                      <div>
                        <strong>Service</strong> —{' '}
                        {(b.service_type && b.service_type.replace(/_/g, ' ')) || '—'}
                      </div>
                      <div>
                        <strong>Vehicle</strong> — {b.vehicle_brand || '—'} ({b.vehicle_type || '—'})
                      </div>
                      <div>
                        <strong>Booked</strong> — {b.created_at ? new Date(b.created_at).toLocaleString() : '—'}
                      </div>
                      {b.scheduled_date && (
                        <div>
                          <strong>Scheduled</strong> — {new Date(b.scheduled_date).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {b.issue_description && (
                      <div className="mechdash-job-details" style={{ marginTop: '-0.5rem' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <strong>Issue</strong> — {b.issue_description}
                        </div>
                      </div>
                    )}

                    {b.status === 'accepted' && liveEta != null && (
                      <div className="mechdash-job-live">
                        <i className="fas fa-clock" />
                        Live ETA for customer: ~{liveEta} min
                      </div>
                    )}

                    <div className="mechdash-job-actions">
                      {b.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="mechdash-btn mechdash-btn-accept"
                            disabled={!canRespondToNewRequests}
                            title={!canRespondToNewRequests ? 'Verify your profile to accept jobs' : ''}
                            onClick={() => canRespondToNewRequests && handleStatusUpdate(id, 'accepted')}
                          >
                            <i className="fas fa-check" /> Accept
                          </button>
                          <button
                            type="button"
                            className="mechdash-btn mechdash-btn-reject"
                            disabled={!canRespondToNewRequests}
                            title={!canRespondToNewRequests ? 'Verify your profile to respond to requests' : ''}
                            onClick={() => canRespondToNewRequests && handleStatusUpdate(id, 'rejected')}
                          >
                            <i className="fas fa-times" /> Reject
                          </button>
                        </>
                      )}
                      {b.status === 'accepted' && (
                        <>
                          <button
                            type="button"
                            className="mechdash-btn mechdash-btn-progress"
                            disabled={!canManageActiveJob(b)}
                            onClick={() => canManageActiveJob(b) && handleStatusUpdate(id, 'mechanic_arrived')}
                          >
                            <i className="fas fa-map-marker-alt" /> I&apos;ve arrived
                          </button>
                          <button
                            type="button"
                            className="mechdash-btn"
                            disabled={!canManageActiveJob(b)}
                            onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                          >
                            <i className="fas fa-map" /> Open job page
                          </button>
                        </>
                      )}
                      {b.status === 'mechanic_arrived' && (
                        <>
                          <span className="mechdash-waiting-inline">
                            <i className="fas fa-hourglass-half" /> Waiting for customer to confirm meet-up
                          </span>
                          <button
                            type="button"
                            className="mechdash-btn"
                            disabled={!canManageActiveJob(b)}
                            onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                          >
                            <i className="fas fa-map" /> Open job page
                          </button>
                        </>
                      )}
                      {b.status === 'arrival_confirmed' && (
                        <>
                          <button
                            type="button"
                            className="mechdash-btn mechdash-btn-progress"
                            disabled={!canManageActiveJob(b)}
                            onClick={() => canManageActiveJob(b) && handleStatusUpdate(id, 'in_progress')}
                          >
                            <i className="fas fa-play" /> Start service
                          </button>
                          <button
                            type="button"
                            className="mechdash-btn"
                            disabled={!canManageActiveJob(b)}
                            onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                          >
                            <i className="fas fa-map" /> Open job page
                          </button>
                        </>
                      )}
                      {b.status === 'in_progress' && (
                        <>
                          <button
                            type="button"
                            className="mechdash-btn mechdash-btn-complete"
                            disabled={!canManageActiveJob(b)}
                            onClick={() => canManageActiveJob(b) && handleStatusUpdate(id, 'completion_pending')}
                          >
                            <i className="fas fa-flag-checkered" /> Mark service complete
                          </button>
                          <button
                            type="button"
                            className="mechdash-btn"
                            disabled={!canManageActiveJob(b)}
                            onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                          >
                            <i className="fas fa-map" /> Open job page
                          </button>
                        </>
                      )}
                      {b.status === 'completion_pending' && (
                        <>
                          <span className="mechdash-waiting-inline">
                            <i className="fas fa-user-check" /> Waiting for customer to confirm completion
                          </span>
                          <button
                            type="button"
                            className="mechdash-btn"
                            disabled={!canManageActiveJob(b)}
                            onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                          >
                            <i className="fas fa-map" /> Open job page
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MechanicDashboard;
