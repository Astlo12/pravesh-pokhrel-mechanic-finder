import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminMechanics, verifyMechanic } from '../../services/api';
import './css/AdminVerification.css';

const AdminVerification = () => {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('unverified'); // 'all', 'verified', 'unverified'

  useEffect(() => {
    fetchMechanics();
  }, [filter]);

  const fetchMechanics = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 100,
        ...(filter === 'verified' && { verified: 'true' }),
        ...(filter === 'unverified' && { verified: 'false' })
      };
      const response = await getAdminMechanics(params);
      setMechanics(response.data.mechanics);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load mechanics');
      console.error('Error fetching mechanics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (mechanicId, currentStatus) => {
    try {
      await verifyMechanic(mechanicId, !currentStatus);
      fetchMechanics();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update verification status');
    }
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

  const unverifiedCount = mechanics.filter(m => !m.is_verified).length;
  const verifiedCount = mechanics.filter(m => m.is_verified).length;

  return (
    <div className="adminverification-container">
      <div className="adminverification-header">
        <div>
          <h1 className="adminverification-title">Mechanic Verification</h1>
          <p className="adminverification-subtitle">Verify mechanics and review their credentials</p>
        </div>
        <Link to="/admin/dashboard" className="adminverification-back-btn">
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </Link>
      </div>

      <div className="adminverification-stats">
        <div className="adminverification-stat-card">
          <div className="adminverification-stat-icon unverified">
            <i className="fas fa-clock"></i>
          </div>
          <div className="adminverification-stat-content">
            <h3 className="adminverification-stat-value">{unverifiedCount}</h3>
            <p className="adminverification-stat-label">Pending Verification</p>
          </div>
        </div>
        <div className="adminverification-stat-card">
          <div className="adminverification-stat-icon verified">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="adminverification-stat-content">
            <h3 className="adminverification-stat-value">{verifiedCount}</h3>
            <p className="adminverification-stat-label">Verified Mechanics</p>
          </div>
        </div>
      </div>

      <div className="adminverification-filters">
        <button
          className={`adminverification-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Mechanics
        </button>
        <button
          className={`adminverification-filter-btn ${filter === 'unverified' ? 'active' : ''}`}
          onClick={() => setFilter('unverified')}
        >
          Pending Verification
        </button>
        <button
          className={`adminverification-filter-btn ${filter === 'verified' ? 'active' : ''}`}
          onClick={() => setFilter('verified')}
        >
          Verified
        </button>
      </div>

      {loading ? (
        <div className="adminverification-loading">Loading mechanics...</div>
      ) : error ? (
        <div className="adminverification-error">{error}</div>
      ) : mechanics.length === 0 ? (
        <div className="adminverification-empty">No mechanics found</div>
      ) : (
        <div className="adminverification-grid">
          {mechanics.map((mechanic) => (
            <div key={mechanic.id} className="adminverification-card">
              <div className="adminverification-card-header">
                <div className="adminverification-user-info">
                  {mechanic.user?.profile_picture ? (
                    <img
                      src={mechanic.user.profile_picture}
                      alt={mechanic.user.name}
                      className="adminverification-avatar"
                    />
                  ) : (
                    <div className="adminverification-avatar-placeholder">
                      {getInitials(mechanic.user?.name)}
                    </div>
                  )}
                  <div>
                    <h3 className="adminverification-name">{mechanic.user?.name || 'N/A'}</h3>
                    <p className="adminverification-email">{mechanic.user?.email || 'N/A'}</p>
                  </div>
                </div>
                {mechanic.is_verified ? (
                  <span className="adminverification-badge verified">
                    <i className="fas fa-check-circle"></i> Verified
                  </span>
                ) : (
                  <span className="adminverification-badge unverified">
                    <i className="fas fa-clock"></i> Pending
                  </span>
                )}
              </div>

              <div className="adminverification-card-body">
                <div className="adminverification-info-row">
                  <span className="adminverification-label">Business Name:</span>
                  <span className="adminverification-value">{mechanic.business_name || 'N/A'}</span>
                </div>
                <div className="adminverification-info-row">
                  <span className="adminverification-label">License Number:</span>
                  <span className="adminverification-value">{mechanic.license_number || 'N/A'}</span>
                </div>
                <div className="adminverification-info-row">
                  <span className="adminverification-label">Years of Experience:</span>
                  <span className="adminverification-value">{mechanic.years_experience || 0} years</span>
                </div>
                <div className="adminverification-info-row">
                  <span className="adminverification-label">Rating:</span>
                  <span className="adminverification-value">
                    {mechanic.rating ? mechanic.rating.toFixed(1) : '0.0'} ⭐ ({mechanic.total_reviews || 0} reviews)
                  </span>
                </div>
                {mechanic.certifications && mechanic.certifications.length > 0 && (
                  <div className="adminverification-info-row">
                    <span className="adminverification-label">Certifications:</span>
                    <span className="adminverification-value">
                      {mechanic.certifications.length} certification(s)
                    </span>
                  </div>
                )}
              </div>

              <div className="adminverification-card-actions">
                <button
                  className={`adminverification-verify-btn ${mechanic.is_verified ? 'verified' : ''}`}
                  onClick={() => handleVerify(mechanic.id, mechanic.is_verified)}
                >
                  {mechanic.is_verified ? (
                    <>
                      <i className="fas fa-times"></i> Unverify
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Verify
                    </>
                  )}
                </button>
                <Link
                  to={`/mechanic/${mechanic.id}`}
                  className="adminverification-view-btn"
                >
                  <i className="fas fa-eye"></i> View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVerification;

