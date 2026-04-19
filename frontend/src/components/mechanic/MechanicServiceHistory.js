import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMechanicBookings } from '../../services/api';
import './css/MechanicWorkspace.css';

const MechanicServiceHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await getMechanicBookings();
      const list = Array.isArray(data) ? data : [];
      const done = list.filter((b) =>
        ['completed', 'cancelled', 'rejected'].includes(b.status)
      );
      done.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setBookings(done);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    const headers = ['BookingRef', 'Customer', 'Service', 'Vehicle', 'Status', 'Created'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = bookings.map((b) => [
      (b.id || b._id || '').toString().slice(0, 12),
      b.customer_name || '',
      (b.service_type || '').replace(/_/g, ' '),
      `${b.vehicle_brand || ''} (${b.vehicle_type || ''})`,
      b.status || '',
      b.created_at ? new Date(b.created_at).toISOString() : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="mechws-page mechws-loading">
        <i className="fas fa-spinner fa-spin" /> Loading history…
      </div>
    );
  }

  return (
    <div className="mechws-page mechws-page-wide">
      <Link to="/dashboard" className="mechws-back">
        <i className="fas fa-arrow-left" /> Back to dashboard
      </Link>
      <header className="mechws-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
        <div>
          <h1>Service history</h1>
          <p>Completed, cancelled, and declined jobs. Export for your records.</p>
        </div>
        <button type="button" className="mechws-btn-primary" onClick={exportCsv} disabled={!bookings.length}>
          <i className="fas fa-file-download" /> Export CSV
        </button>
      </header>

      <div className="mechws-card">
        <div className="mechws-card-header">
          <i className="fas fa-clipboard-list" /> Records ({bookings.length})
        </div>
        <div className="mechws-card-body" style={{ padding: 0 }}>
          {bookings.length === 0 ? (
            <div className="mechws-placeholder" style={{ margin: '1rem', border: 'none' }}>
              <i className="fas fa-folder-open" />
              <p>No closed jobs yet.</p>
            </div>
          ) : (
            <div className="mechws-table-wrap">
              <table className="mechws-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id || b._id}>
                      <td>{(b.id || b._id || '').toString().slice(0, 8).toUpperCase()}</td>
                      <td>{b.customer_name || '—'}</td>
                      <td>{(b.service_type || '').replace(/_/g, ' ')}</td>
                      <td>
                        {b.vehicle_brand || '—'} ({b.vehicle_type || '—'})
                      </td>
                      <td>{b.status}</td>
                      <td>{b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MechanicServiceHistory;
