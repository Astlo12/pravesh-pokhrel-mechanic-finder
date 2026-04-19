import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/api';
import './Notifications.css';

function formatTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const NotificationBell = ({ variant = 'default' }) => {
  const navigate = useNavigate();
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const wrapRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await getUnreadNotificationCount();
      setCount(typeof data.count === 'number' ? data.count : 0);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getNotifications({ limit: 15, skip: 0 });
      setItems(data.notifications || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, 45000);
    return () => clearInterval(t);
  }, [fetchCount]);

  useEffect(() => {
    if (!socket) return;
    const onRefresh = () => {
      fetchCount();
      if (open) fetchList();
    };
    socket.on('notifications:refresh', onRefresh);
    return () => socket.off('notifications:refresh', onRefresh);
  }, [socket, open, fetchCount, fetchList]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', onDocClick);
      fetchList();
    }
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, fetchList]);

  const toggle = (e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  };

  const handleMarkAll = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })));
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (n) => {
    try {
      if (!n.read) {
        await markNotificationRead(n.id);
        setCount((c) => Math.max(0, c - 1));
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id ? { ...x, read: true, read_at: new Date().toISOString() } : x
          )
        );
      }
    } catch {
      /* still navigate */
    }
    setOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <div
      className={`notification-bell-wrap ${variant === 'admin' ? 'admin' : ''}`}
      ref={wrapRef}
    >
      <button
        type="button"
        className="notification-bell-btn"
        aria-label="Notifications"
        onClick={toggle}
      >
        <i className="fas fa-bell" aria-hidden />
        {count > 0 && (
          <span className="notification-bell-badge">{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-panel-header">
            <h3>Notifications</h3>
            <div className="notification-panel-actions">
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={markingAll || count === 0}
              >
                Mark all read
              </button>
              <Link to="/notifications" onClick={() => setOpen(false)}>
                History
              </Link>
            </div>
          </div>
          <div className="notification-panel-list">
            {loading ? (
              <div className="notification-panel-loading">Loading…</div>
            ) : items.length === 0 ? (
              <div className="notification-panel-empty">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notification-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="notification-item-title">
                    {!n.read && <span className="notification-unread-dot" aria-hidden />}
                    {n.title}
                  </div>
                  {n.body && <div className="notification-item-body">{n.body}</div>}
                  <div className="notification-item-meta">
                    {formatTime(n.created_at)}
                    {n.type && (
                      <>
                        {' · '}
                        <span>{String(n.type).replace(/_/g, ' ')}</span>
                      </>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
