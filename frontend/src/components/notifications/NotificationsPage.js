import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/api';
import './Notifications.css';

const PAGE_SIZE = 25;

function formatTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  const [filter, setFilter] = useState('all'); // all | unread
  const [items, setItems] = useState([]);
  const skipRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (reset) => {
    const nextSkip = reset ? 0 : skipRef.current;
    if (reset) {
      skipRef.current = 0;
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const params = {
        limit: PAGE_SIZE,
        skip: nextSkip,
        unread_only: filter === 'unread' ? 'true' : undefined,
      };
      const { data } = await getNotifications(params);
      const batch = data.notifications || [];
      if (reset) {
        setItems(batch);
        skipRef.current = batch.length;
      } else {
        setItems((prev) => [...prev, ...batch]);
        skipRef.current = nextSkip + batch.length;
      }
      setHasMore(batch.length >= PAGE_SIZE);
    } catch {
      if (reset) setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    skipRef.current = 0;
    setHasMore(true);
    load(true);
  }, [filter, load]);

  useEffect(() => {
    if (!socket) return;
    const onRefresh = () => {
      skipRef.current = 0;
      setHasMore(true);
      load(true);
    };
    socket.on('notifications:refresh', onRefresh);
    return () => socket.off('notifications:refresh', onRefresh);
  }, [socket, load]);

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      if (filter === 'unread') {
        skipRef.current = 0;
        await load(true);
      } else {
        setItems((prev) => prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })));
      }
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOne = async (e, n) => {
    e.stopPropagation();
    if (n.read) return;
    try {
      await markNotificationRead(n.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, read: true, read_at: new Date().toISOString() } : x
        )
      );
    } catch {
      /* ignore */
    }
  };

  const handleRowOpen = async (n) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id ? { ...x, read: true, read_at: new Date().toISOString() } : x
          )
        );
      } catch {
        /* ignore */
      }
    }
    if (n.link) navigate(n.link);
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="notifications-page">
      <h1>Notifications</h1>
      <p className="notifications-page-sub">
        In-app alerts for bookings, reviews, and admin updates. Unread items are highlighted.
      </p>

      <div className="notifications-toolbar">
        <div className="notifications-filter">
          <button
            type="button"
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={filter === 'unread' ? 'active' : ''}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
        </div>
        <button
          type="button"
          className="btn-mark-all"
          onClick={handleMarkAll}
          disabled={markingAll || unreadCount === 0}
        >
          Mark all as read
        </button>
      </div>

      <div className="notifications-list-page">
        {loading ? (
          <div className="notification-panel-loading" style={{ padding: '2rem' }}>
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="notification-panel-empty" style={{ padding: '2.5rem' }}>
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </div>
        ) : (
          <>
            {items.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className={`notifications-row ${!n.read ? 'unread' : ''}`}
                onClick={() => handleRowOpen(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowOpen(n);
                  }
                }}
              >
                <div className="notifications-row-main">
                  <div className="notifications-type-tag">{String(n.type || 'general').replace(/_/g, ' ')}</div>
                  <div className="notification-item-title" style={{ marginBottom: '0.2rem' }}>
                    {!n.read && <span className="notification-unread-dot" aria-hidden />}
                    {n.title}
                  </div>
                  {n.body && (
                    <div className="notification-item-body" style={{ color: '#4b5563' }}>
                      {n.body}
                    </div>
                  )}
                  <div className="notification-item-meta">{formatTime(n.created_at)}</div>
                </div>
                <div className="notifications-row-actions">
                  {!n.read && (
                    <button type="button" onClick={(e) => handleMarkOne(e, n)}>
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <button
                type="button"
                className="notifications-load-more"
                disabled={loadingMore}
                onClick={() => load(false)}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
