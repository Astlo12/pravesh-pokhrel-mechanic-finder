import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAdminUsers, deleteUser } from '../../services/api';
import './css/AdminUsers.css';

const AdminUsers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [page, type]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        ...(type !== 'all' && { type }),
        ...(search && { search })
      };
      const response = await getAdminUsers(params);
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleDelete = async (userId, userName) => {
    if (deleteConfirm !== userId) {
      setDeleteConfirm(userId);
      return;
    }

    try {
      await deleteUser(userId);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="adminusers-container">
      <div className="adminusers-header">
        <div>
          <h1 className="adminusers-title">User Management</h1>
          <p className="adminusers-subtitle">Manage all customers and mechanics</p>
        </div>
        <Link to="/admin/dashboard" className="adminusers-back-btn">
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </Link>
      </div>

      <div className="adminusers-filters">
        <form onSubmit={handleSearch} className="adminusers-search-form">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adminusers-search-input"
          />
          <button type="submit" className="adminusers-search-btn">
            <i className="fas fa-search"></i>
          </button>
        </form>

        <div className="adminusers-type-filter">
          <button
            className={`adminusers-filter-btn ${type === 'all' ? 'active' : ''}`}
            onClick={() => { setType('all'); setPage(1); }}
          >
            All Users
          </button>
          <button
            className={`adminusers-filter-btn ${type === 'customer' ? 'active' : ''}`}
            onClick={() => { setType('customer'); setPage(1); }}
          >
            Customers
          </button>
          <button
            className={`adminusers-filter-btn ${type === 'mechanic' ? 'active' : ''}`}
            onClick={() => { setType('mechanic'); setPage(1); }}
          >
            Mechanics
          </button>
        </div>
      </div>

      {loading ? (
        <div className="adminusers-loading">Loading users...</div>
      ) : error ? (
        <div className="adminusers-error">{error}</div>
      ) : users.length === 0 ? (
        <div className="adminusers-empty">No users found</div>
      ) : (
        <>
          <div className="adminusers-table-container">
            <table className="adminusers-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="adminusers-user-cell">
                        {user.profile_picture ? (
                          <img
                            src={user.profile_picture}
                            alt={user.name}
                            className="adminusers-avatar"
                          />
                        ) : (
                          <div className="adminusers-avatar-placeholder">
                            {getInitials(user.name)}
                          </div>
                        )}
                        <span className="adminusers-name">{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <span className={`adminusers-type-badge ${user.user_type}`}>
                        {user.user_type}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="adminusers-delete-btn"
                        onClick={() => handleDelete(user.id, user.name)}
                      >
                        {deleteConfirm === user.id ? (
                          <>
                            <i className="fas fa-check"></i> Confirm
                          </>
                        ) : (
                          <>
                            <i className="fas fa-trash"></i> Delete
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="adminusers-pagination">
              <button
                className="adminusers-page-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <span className="adminusers-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="adminusers-page-btn"
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

export default AdminUsers;

