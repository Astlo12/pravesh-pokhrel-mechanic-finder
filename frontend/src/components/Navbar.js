import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChatUnread } from '../context/ChatUnreadContext';
import { getMyMechanicProfile } from '../services/api';
import logo from '../images/logooffindmech.png';
import NotificationBell from './notifications/NotificationBell';
import './css/Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { total: chatUnreadTotal } = useChatUnread();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mechanicId, setMechanicId] = useState(null);
  const dropdownRef = useRef(null);

  // Check if a path is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get profile picture or initials
  const getProfileDisplay = (user) => {
    if (user?.profile_picture) {
      return (
        <img 
          src={user.profile_picture} 
          alt={user.name}
          className="user-profile-picture"
        />
      );
    }
    return <div className="user-avatar-initials">{getUserInitials(user?.name)}</div>;
  };

  // Fetch mechanic ID if user is a mechanic
  useEffect(() => {
    const fetchMechanicId = async () => {
      if (user && user.user_type === 'mechanic') {
        try {
          const response = await getMyMechanicProfile();
          setMechanicId(response.data.mechanicId);
        } catch (error) {
          console.error('Error fetching mechanic ID:', error);
        }
      }
    };

    fetchMechanicId();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Admin Navigation
  if (user && user.user_type === 'admin') {
    return (
      <nav className="navbar navbar-admin">
        <div className="navbar-container">
          <Link to="/admin/dashboard" className="navbar-logo">
            <img src={logo} alt="FindMech Logo" className="logo-img" />
            <span className="logo-text">FindMech Admin</span>
          </Link>
          <div className="navbar-menu navbar-menu-admin">
            <Link 
              to="/admin/dashboard" 
              className={`navbar-link-admin ${isActive('/admin/dashboard') ? 'active' : ''}`}
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </Link>
            <Link 
              to="/admin/users" 
              className={`navbar-link-admin ${isActive('/admin/users') ? 'active' : ''}`}
            >
              <i className="fas fa-users"></i>
              <span>Users</span>
            </Link>
            <Link 
              to="/admin/mechanics" 
              className={`navbar-link-admin ${isActive('/admin/mechanics') ? 'active' : ''}`}
            >
              <i className="fas fa-tools"></i>
              <span>Mechanics</span>
            </Link>
            <Link 
              to="/admin/bookings" 
              className={`navbar-link-admin ${isActive('/admin/bookings') ? 'active' : ''}`}
            >
              <i className="fas fa-calendar-check"></i>
              <span>Bookings</span>
            </Link>
            <Link 
              to="/admin/verification" 
              className={`navbar-link-admin ${isActive('/admin/verification') ? 'active' : ''}`}
            >
              <i className="fas fa-shield-alt"></i>
              <span>Verification</span>
            </Link>

            <NotificationBell variant="admin" />
            
            <div className="user-menu" ref={dropdownRef}>
              <button 
                className="user-avatar-btn" 
                onClick={toggleDropdown}
                aria-label="User menu"
              >
                <div className="user-avatar">
                  {getProfileDisplay(user)}
                </div>
                <span className="admin-name">{user.name}</span>
                <i className={`fas fa-chevron-down dropdown-arrow ${dropdownOpen ? 'open' : ''}`}></i>
              </button>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {getProfileDisplay(user)}
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-user-name">{user.name}</div>
                      <div className="dropdown-user-email">{user.email}</div>
                      <div className="dropdown-user-type">
                        <i className="fas fa-user-shield"></i>
                        <span>Administrator</span>
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link
                    to="/notifications"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <i className="fas fa-bell"></i>
                    <span>Notifications</span>
                  </Link>
                  <button 
                    className="dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Regular Navigation for customers and mechanics
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img src={logo} alt="FindMech Logo" className="logo-img" />
          <span className="logo-text">FindMech</span>
        </Link>
        <div className="navbar-menu">
          {user ? (
            <>
              {/* Show "Find Mechanics" only for customers */}
              {user.user_type === 'customer' && (
                <Link to="/mechanics" className="navbar-link">
                  <i className="fas fa-search"></i> Find Mechanics
                </Link>
              )}
              
              {/* Show "Dashboard" link for mechanics */}
              {user.user_type === 'mechanic' && (
                <>
                  <Link to="/dashboard" className="navbar-link">
                    <i className="fas fa-tachometer-alt"></i> Dashboard
                  </Link>
                  <Link to="/mechanic/workspace/bookings" className="navbar-link">
                    <i className="fas fa-calendar-check"></i> Bookings
                  </Link>
                  <Link to="/mechanic/workspace/edit-profile" className="navbar-link">
                    <i className="fas fa-user-edit"></i> Profile
                  </Link>
                </>
              )}

              <NotificationBell />
              
              <div className="user-menu" ref={dropdownRef}>
                <button 
                  className="user-avatar-btn" 
                  onClick={toggleDropdown}
                  aria-label="User menu"
                >
                  <div className="user-avatar">
                    {getProfileDisplay(user)}
                  </div>
                  <i className={`fas fa-chevron-down dropdown-arrow ${dropdownOpen ? 'open' : ''}`}></i>
                </button>
                {dropdownOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-avatar">
                        {getProfileDisplay(user)}
                      </div>
                      <div className="dropdown-user-info">
                        <div className="dropdown-user-name">{user.name}</div>
                        <div className="dropdown-user-email">{user.email}</div>
                        <div className="dropdown-user-type">
                          <i className={`fas ${user.user_type === 'mechanic' ? 'fa-tools' : 'fa-motorcycle'}`}></i>
                          <span>{user.user_type === 'mechanic' ? 'Mechanic' : 'Customer'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    
                    {/* Customer Menu Items */}
                    {user.user_type === 'customer' && (
                      <>
                        <Link 
                          to="/dashboard" 
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-tachometer-alt"></i>
                          <span>Dashboard</span>
                        </Link>
                        <Link 
                          to="/mechanics" 
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-search"></i>
                          <span>Find Mechanics</span>
                        </Link>
                        <Link 
                          to="/my-bookings" 
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-calendar-check"></i>
                          <span>My Bookings</span>
                          {chatUnreadTotal > 0 && (
                            <span className="navbar-dropdown-msg-badge" aria-label={`${chatUnreadTotal} unread messages`}>
                              {chatUnreadTotal > 99 ? '99+' : chatUnreadTotal}
                            </span>
                          )}
                        </Link>
                        <Link 
                          to="/service-history" 
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-history"></i>
                          <span>Service history</span>
                        </Link>
                        <Link 
                          to="/profile" 
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-user-circle"></i>
                          <span>My Profile</span>
                        </Link>
                        <Link
                          to="/notifications"
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-bell"></i>
                          <span>Notifications</span>
                        </Link>
                      </>
                    )}
                    
                    {/* Mechanic Menu Items */}
                    {user.user_type === 'mechanic' && (
                      <>
                        <Link 
                          to="/dashboard" 
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-tachometer-alt"></i>
                          <span>Workspace</span>
                        </Link>
                        <Link 
                          to="/mechanic/workspace/bookings"
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-calendar-check"></i>
                          <span>All bookings</span>
                        </Link>
                        <Link 
                          to="/mechanic/workspace/edit-profile"
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-user-edit"></i>
                          <span>Edit profile</span>
                        </Link>
                        {mechanicId && (
                          <Link 
                            to={`/mechanic/${mechanicId}`}
                            className="dropdown-item"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <i className="fas fa-id-card"></i>
                            <span>Public profile</span>
                          </Link>
                        )}
                        <Link 
                          to="/mechanic/workspace/reviews"
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-star"></i>
                          <span>Reviews</span>
                        </Link>
                        <Link 
                          to="/mechanic/workspace/history"
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-history"></i>
                          <span>Service history</span>
                        </Link>
                        <Link 
                          to="/mechanic/workspace/messages"
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-comments"></i>
                          <span>Messages</span>
                          {chatUnreadTotal > 0 && (
                            <span className="navbar-dropdown-msg-badge" aria-label={`${chatUnreadTotal} unread messages`}>
                              {chatUnreadTotal > 99 ? '99+' : chatUnreadTotal}
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/notifications"
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <i className="fas fa-bell"></i>
                          <span>Notifications</span>
                        </Link>
                      </>
                    )}
                    
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item logout-item"
                      onClick={handleLogout}
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/mechanics" className="navbar-link">
                Find Mechanics
              </Link>
              <Link to="/login" className="navbar-link">
                Login
              </Link>
              <Link to="/register" className="navbar-button">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

