import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAdminMechanics, verifyMechanic } from '../../services/api';
import './css/AdminMechanics.css';

const AdminMechanics = () => {
  const [searchParams] = useSearchParams();
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState(searchParams.get('verified') || 'all');
  const [onlineFilter, setOnlineFilter] = useState(searchParams.get('online') || 'all');

  useEffect(() => {
    fetchMechanics();
  }, [page, verifiedFilter, onlineFilter]);

  const fetchMechanics = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        ...(verifiedFilter !== 'all' && { verified: verifiedFilter }),
        ...(onlineFilter !== 'all' && { online: onlineFilter }),
        ...(search && { search })
      };
      const response = await getAdminMechanics(params);
      setMechanics(response.data.mechanics);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load mechanics');
      console.error('Error fetching mechanics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMechanics();
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

  return (
    <div className="adminmechanics-container">
      <div className="adminmechanics-header">
        <div>
          <h1 className="adminmechanics-title">Mechanic Management</h1>
          <p className="adminmechanics-subtitle">Manage and verify mechanics</p>
        </div>
        <Link to="/admin/dashboard" className="adminmechanics-back-btn">
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </Link>
      </div>

      <div className="adminmechanics-filters">
        <form onSubmit={handleSearch} className="adminmechanics-search-form">
          <input
            type="text"
            placeholder="Search by name, email, or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adminmechanics-search-input"
          />
          <button type="submit" className="adminmechanics-search-btn">
            <i className="fas fa-search"></i>
          </button>
        </form>

        <div className="adminmechanics-filter-group">
          <div className="adminmechanics-filter">
            <label>Verification:</label>
            <select
              value={verifiedFilter}
              onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1); }}
              className="adminmechanics-select"
            >
              <option value="all">All</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>

          <div className="adminmechanics-filter">
            <label>Status:</label>
            <select
              value={onlineFilter}
              onChange={(e) => { setOnlineFilter(e.target.value); setPage(1); }}
              className="adminmechanics-select"
            >
              <option value="all">All</option>
              <option value="true">Online</option>
              <option value="false">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="adminmechanics-loading">Loading mechanics...</div>
      ) : error ? (
        <div className="adminmechanics-error">{error}</div>
      ) : mechanics.length === 0 ? (
        <div className="adminmechanics-empty">No mechanics found</div>
      ) : (
        <>
          <div className="adminmechanics-grid">
            {mechanics.map((mechanic) => (
              <div key={mechanic.id} className="adminmechanics-card">
                <div className="adminmechanics-card-header">
                  <div className="adminmechanics-user-info">
                    {mechanic.user?.profile_picture ? (
                      <img
                        src={mechanic.user.profile_picture}
                        alt={mechanic.user.name}
                        className="adminmechanics-avatar"
                      />
                    ) : (
                      <div className="adminmechanics-avatar-placeholder">
                        {getInitials(mechanic.user?.name)}
                      </div>
                    )}
                    <div>
                      <h3 className="adminmechanics-name">{mechanic.user?.name || 'N/A'}</h3>
                      <p className="adminmechanics-email">{mechanic.user?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="adminmechanics-status-badges">
                    {mechanic.is_verified && (
                      <span className="adminmechanics-badge verified">
                        <i className="fas fa-check-circle"></i> Verified
                      </span>
                    )}
                    {mechanic.is_online ? (
                      <span className="adminmechanics-badge online">
                        <i className="fas fa-circle"></i> Online
                      </span>
                    ) : (
                      <span className="adminmechanics-badge offline">
                        <i className="fas fa-circle"></i> Offline
                      </span>
                    )}
                  </div>
                </div>

                <div className="adminmechanics-card-body">
                  <div className="adminmechanics-info-row">
                    <span className="adminmechanics-label">Business:</span>
                    <span className="adminmechanics-value">{mechanic.business_name || 'N/A'}</span>
                  </div>
                  <div className="adminmechanics-info-row">
                    <span className="adminmechanics-label">License:</span>
                    <span className="adminmechanics-value">{mechanic.license_number || 'N/A'}</span>
                  </div>
                  <div className="adminmechanics-info-row">
                    <span className="adminmechanics-label">Experience:</span>
                    <span className="adminmechanics-value">{mechanic.years_experience || 0} years</span>
                  </div>
                  <div className="adminmechanics-info-row">
                    <span className="adminmechanics-label">Rating:</span>
                    <span className="adminmechanics-value">
                      {mechanic.rating ? mechanic.rating.toFixed(1) : '0.0'} ⭐
                      ({mechanic.total_reviews || 0} reviews)
                    </span>
                  </div>
                  <div className="adminmechanics-info-row">
                    <span className="adminmechanics-label">Service Radius:</span>
                    <span className="adminmechanics-value">{mechanic.service_radius || 0} km</span>
                  </div>
                </div>

                <div className="adminmechanics-card-actions">
                  <button
                    className={`adminmechanics-verify-btn ${mechanic.is_verified ? 'verified' : ''}`}
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
                    className="adminmechanics-view-btn"
                  >
                    <i className="fas fa-eye"></i> View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="adminmechanics-pagination">
              <button
                className="adminmechanics-page-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <span className="adminmechanics-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="adminmechanics-page-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminMechanics;

