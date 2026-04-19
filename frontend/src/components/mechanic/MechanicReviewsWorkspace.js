import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMechanicProfileId, getMechanicReviews } from '../../services/api';
import './css/MechanicWorkspace.css';

const MechanicReviewsWorkspace = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ avg: null, count: 0 });

  const load = useCallback(async () => {
    try {
      const { data: idData } = await getMechanicProfileId();
      const id = idData.mechanicId;
      const { data } = await getMechanicReviews(id);
      const list = Array.isArray(data) ? data : [];
      setReviews(list);
      if (list.length) {
        const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
        setSummary({ avg: sum / list.length, count: list.length });
      } else {
        setSummary({ avg: null, count: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="mechws-page mechws-loading">
        <i className="fas fa-spinner fa-spin" /> Loading reviews…
      </div>
    );
  }

  return (
    <div className="mechws-page">
      <Link to="/dashboard" className="mechws-back">
        <i className="fas fa-arrow-left" /> Back to dashboard
      </Link>
      <header className="mechws-header">
        <h1>Customer reviews</h1>
        <p>
          {summary.count > 0
            ? `Average ${summary.avg.toFixed(1)} / 5 from ${summary.count} review${summary.count === 1 ? '' : 's'}.`
            : 'No reviews yet — great service earns ratings over time.'}
        </p>
      </header>

      <div className="mechws-card">
        <div className="mechws-card-header">
          <i className="fas fa-star" /> All feedback
        </div>
        <div className="mechws-card-body" style={{ padding: 0 }}>
          {reviews.length === 0 ? (
            <div className="mechws-placeholder" style={{ margin: '1rem', border: 'none' }}>
              <i className="fas fa-star-half-alt" />
              <p>No reviews to show.</p>
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id || r._id} className="mechws-review-item">
                <div className="mechws-review-meta">
                  <strong>{r.customer_name || 'Customer'}</strong>
                  <span className="mechws-stars">
                    <i className="fas fa-star" /> {r.rating}/5
                  </span>
                </div>
                {r.comment && <p style={{ margin: '0.35rem 0', color: '#495057' }}>{r.comment}</p>}
                <small style={{ color: '#6c757d' }}>
                  {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                </small>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MechanicReviewsWorkspace;
