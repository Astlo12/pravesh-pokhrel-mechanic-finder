import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getMechanicBookings,
  getMechanicProfileId,
  getMechanicProfile,
  updateBookingStatus,
} from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import './css/MechanicWorkspace.css';

const statusLabel = (status) => {
  const map = {
    pending: 'Pending',
    accepted: 'En route',
    mechanic_arrived: 'Arrived (confirm)',
    arrival_confirmed: 'Ready to start',
    in_progress: 'In progress',
    completion_pending: 'Awaiting customer',
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

const MechanicBookingList = () => {
  const navigate = useNavigate();
  const socket = useSocket();

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [etaByBooking, setEtaByBooking] = useState({});

  const loadData = useCallback(async () => {
    try {
      const idRes = await getMechanicProfileId();
      const id = idRes.data.mechanicId;
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

  useEffect(() => {
    if (!socket || !bookings.length) return;
    bookings.forEach((b) => {
      if (ACTIVE_JOB_STATUSES.includes(b.status)) {
        const bid = b.id || b._id;
        if (bid) socket.emit('booking:join', { bookingId: bid });
      }
    });
  }, [socket, bookings]);

  const isVerified = !!profile?.is_verified;
  const canRespondToNewRequests = isVerified;
  const canManageActiveJob = (booking) =>
    isVerified || ACTIVE_JOB_STATUSES.includes(booking.status);

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const active = bookings.filter((b) => ACTIVE_JOB_STATUSES.includes(b.status)).length;
    const history = bookings.filter((b) =>
      ['completed', 'cancelled', 'rejected'].includes(b.status)
    ).length;
    return { pending, active, history, total: bookings.length };
  }, [bookings]);

  const filtered = useMemo(() => {
    let list = [...bookings];
    if (tab === 'pending') list = list.filter((b) => b.status === 'pending');
    else if (tab === 'active') {
      list = list.filter((b) => ACTIVE_JOB_STATUSES.includes(b.status));
    } else if (tab === 'history') {
      list = list.filter((b) => ['completed', 'cancelled', 'rejected'].includes(b.status));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((b) => {
        const id = (b.id || b._id || '').toString().toLowerCase();
        const name = (b.customer_name || '').toLowerCase();
        const svc = (b.service_type || '').toLowerCase();
        const brand = (b.vehicle_brand || '').toLowerCase();
        return id.includes(q) || name.includes(q) || svc.includes(q) || brand.includes(q);
      });
    }
    const ts = (b) => (b.created_at ? new Date(b.created_at).getTime() : 0);
    return list.sort((a, b) => ts(b) - ts(a));
  }, [bookings, tab, search]);

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      await updateBookingStatus(bookingId, { status });
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Could not update booking');
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
      <div className="mechws-page mechws-loading">
        <i className="fas fa-spinner fa-spin" /> Loading bookings…
      </div>
    );
  }

  return (
    <div className="mechws-page mechws-page-wide mechws-bookings-page">
      <Link to="/dashboard" className="mechws-back">
        <i className="fas fa-arrow-left" /> Back to dashboard
      </Link>

      <header className="mechws-header">
        <h1>All bookings</h1>
        <p>
          View every request, filter by status, and update progress. Live ETA is shown while you&apos;re en route;
          after you mark arrived, the customer must confirm before you start work.
        </p>
      </header>

      {!isVerified && (
        <div className="mechws-bookings-verify-note" role="status">
          <i className="fas fa-user-shield" />
          <span>
            <strong>Unverified:</strong> you can’t accept new requests until an admin verifies your profile. You may
            still manage existing active jobs.
          </span>
        </div>
      )}

      <div className="mechws-bookings-toolbar">
        <div className="mechws-bookings-tabs" role="tablist">
          <button
            type="button"
            className={`mechws-bookings-tab ${tab === 'all' ? 'mechws-bookings-tab--active' : ''}`}
            onClick={() => setTab('all')}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            className={`mechws-bookings-tab ${tab === 'pending' ? 'mechws-bookings-tab--active' : ''}`}
            onClick={() => setTab('pending')}
          >
            New ({stats.pending})
          </button>
          <button
            type="button"
            className={`mechws-bookings-tab ${tab === 'active' ? 'mechws-bookings-tab--active' : ''}`}
            onClick={() => setTab('active')}
          >
            Active ({stats.active})
          </button>
          <button
            type="button"
            className={`mechws-bookings-tab ${tab === 'history' ? 'mechws-bookings-tab--active' : ''}`}
            onClick={() => setTab('history')}
          >
            History ({stats.history})
          </button>
        </div>
        <div className="mechws-bookings-search">
          <i className="fas fa-search" aria-hidden />
          <input
            type="search"
            placeholder="Search customer, service, vehicle, booking ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search bookings"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mechws-placeholder">
          <i className="fas fa-calendar-times" />
          <p>No bookings match this view.</p>
        </div>
      ) : (
        <>
          <div className="mechws-bookings-table-wrap">
            <table className="mechws-bookings-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Service &amp; vehicle</th>
                  <th>Status</th>
                  <th>Booked</th>
                  <th>ETA</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const id = b.id || b._id;
                  const liveEta = etaByBooking[id] ?? b.estimated_eta;
                  return (
                    <tr key={id}>
                      <td className="mechws-bookings-ref">{id ? id.toString().slice(0, 8).toUpperCase() : '—'}</td>
                      <td>
                        <div className="mechws-bookings-customer">
                          <span className="mechws-bookings-avatar">{initials(b.customer_name)}</span>
                          <div>
                            <div className="mechws-bookings-name">{b.customer_name || 'Customer'}</div>
                            {b.customer_phone && (
                              <a href={`tel:${b.customer_phone}`} className="mechws-bookings-phone">
                                {b.customer_phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="mechws-bookings-svc">
                          {(b.service_type || '').replace(/_/g, ' ') || '—'}
                        </div>
                        <div className="mechws-bookings-veh">
                          {b.vehicle_brand || '—'} · {b.vehicle_type || '—'}
                        </div>
                        {b.issue_description && (
                          <div className="mechws-bookings-issue" title={b.issue_description}>
                            {b.issue_description.slice(0, 60)}
                            {b.issue_description.length > 60 ? '…' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`mechws-bstatus mechws-bstatus--${b.status}`}>
                          {statusLabel(b.status)}
                        </span>
                      </td>
                      <td className="mechws-bookings-date">
                        {b.created_at ? new Date(b.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="mechws-bookings-eta">
                        {b.status === 'accepted' && liveEta != null ? `~${liveEta} min` : '—'}
                      </td>
                      <td>
                        <div className="mechws-bookings-actions">
                          {b.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="mechws-ba mechws-ba--accept"
                                disabled={!canRespondToNewRequests}
                                title={!canRespondToNewRequests ? 'Verify profile to accept' : 'Accept'}
                                onClick={() => canRespondToNewRequests && handleStatusUpdate(id, 'accepted')}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="mechws-ba mechws-ba--reject"
                                disabled={!canRespondToNewRequests}
                                onClick={() => canRespondToNewRequests && handleStatusUpdate(id, 'rejected')}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {b.status === 'accepted' && (
                            <>
                              <button
                                type="button"
                                className="mechws-ba mechws-ba--prog"
                                disabled={!canManageActiveJob(b)}
                                onClick={() => canManageActiveJob(b) && handleStatusUpdate(id, 'mechanic_arrived')}
                              >
                                Arrived
                              </button>
                              <button
                                type="button"
                                className="mechws-ba mechws-ba--track"
                                disabled={!canManageActiveJob(b)}
                                onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                              >
                                Job page
                              </button>
                            </>
                          )}
                          {(b.status === 'mechanic_arrived' || b.status === 'completion_pending') && (
                            <button
                              type="button"
                              className="mechws-ba mechws-ba--track"
                              disabled={!canManageActiveJob(b)}
                              onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                            >
                              Job page
                            </button>
                          )}
                          {b.status === 'arrival_confirmed' && (
                            <>
                              <button
                                type="button"
                                className="mechws-ba mechws-ba--prog"
                                disabled={!canManageActiveJob(b)}
                                onClick={() => canManageActiveJob(b) && handleStatusUpdate(id, 'in_progress')}
                              >
                                Start
                              </button>
                              <button
                                type="button"
                                className="mechws-ba mechws-ba--track"
                                disabled={!canManageActiveJob(b)}
                                onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                              >
                                Job page
                              </button>
                            </>
                          )}
                          {b.status === 'in_progress' && (
                            <>
                              <button
                                type="button"
                                className="mechws-ba mechws-ba--done"
                                disabled={!canManageActiveJob(b)}
                                onClick={() => canManageActiveJob(b) && handleStatusUpdate(id, 'completion_pending')}
                              >
                                Done
                              </button>
                              <button
                                type="button"
                                className="mechws-ba mechws-ba--track"
                                disabled={!canManageActiveJob(b)}
                                onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                              >
                                Job page
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mechws-bookings-cards">
            {filtered.map((b) => {
              const id = b.id || b._id;
              const liveEta = etaByBooking[id] ?? b.estimated_eta;
              return (
                <article key={id} className="mechws-bookings-card">
                  <div className="mechws-bookings-card-head">
                    <span className={`mechws-bstatus mechws-bstatus--${b.status}`}>{statusLabel(b.status)}</span>
                    <span className="mechws-bookings-ref">{id?.toString().slice(0, 8).toUpperCase()}</span>
                  </div>
                  <h3>{b.customer_name || 'Customer'}</h3>
                  {b.customer_phone && (
                    <a href={`tel:${b.customer_phone}`} className="mechws-bookings-phone">
                      {b.customer_phone}
                    </a>
                  )}
                  <p className="mechws-bookings-card-meta">
                    {(b.service_type || '').replace(/_/g, ' ')} · {b.vehicle_brand || '—'} ({b.vehicle_type || '—'})
                  </p>
                  {b.issue_description && <p className="mechws-bookings-issue">{b.issue_description}</p>}
                  <p className="mechws-bookings-card-date">
                    {b.created_at ? new Date(b.created_at).toLocaleString() : ''}
                  </p>
                  {b.status === 'accepted' && liveEta != null && (
                    <p className="mechws-bookings-card-eta">
                      <i className="fas fa-clock" /> ETA ~{liveEta} min
                    </p>
                  )}
                  <div className="mechws-bookings-actions mechws-bookings-actions--stack">
                    {b.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="mechws-ba mechws-ba--accept"
                          disabled={!canRespondToNewRequests}
                          onClick={() => canRespondToNewRequests && handleStatusUpdate(id, 'accepted')}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="mechws-ba mechws-ba--reject"
                          disabled={!canRespondToNewRequests}
                          onClick={() => canRespondToNewRequests && handleStatusUpdate(id, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {b.status === 'accepted' && (
                      <>
                        <button
                          type="button"
                          className="mechws-ba mechws-ba--prog"
                          disabled={!canManageActiveJob(b)}
                          onClick={() => canManageActiveJob(b) && handleStatusUpdate(id, 'mechanic_arrived')}
                        >
                          I&apos;ve arrived
                        </button>
                        <button
                          type="button"
                          className="mechws-ba mechws-ba--track"
                          disabled={!canManageActiveJob(b)}
                          onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                        >
                          Open job page
                        </button>
                      </>
                    )}
                    {(b.status === 'mechanic_arrived' || b.status === 'completion_pending') && (
                      <button
                        type="button"
                        className="mechws-ba mechws-ba--track"
                        disabled={!canManageActiveJob(b)}
                        onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                      >
                        Open job page
                      </button>
                    )}
                    {b.status === 'arrival_confirmed' && (
                      <>
                        <button
                          type="button"
                          className="mechws-ba mechws-ba--prog"
                          disabled={!canManageActiveJob(b)}
                          onClick={() => canManageActiveJob(b) && handleStatusUpdate(id, 'in_progress')}
                        >
                          Start service
                        </button>
                        <button
                          type="button"
                          className="mechws-ba mechws-ba--track"
                          disabled={!canManageActiveJob(b)}
                          onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                        >
                          Open job page
                        </button>
                      </>
                    )}
                    {b.status === 'in_progress' && (
                      <>
                        <button
                          type="button"
                          className="mechws-ba mechws-ba--done"
                          disabled={!canManageActiveJob(b)}
                          onClick={() => canManageActiveJob(b) && handleStatusUpdate(id, 'completion_pending')}
                        >
                          Mark service complete
                        </button>
                        <button
                          type="button"
                          className="mechws-ba mechws-ba--track"
                          disabled={!canManageActiveJob(b)}
                          onClick={() => canManageActiveJob(b) && navigate(`/track-booking/${id}`)}
                        >
                          Open job page
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MechanicBookingList;
