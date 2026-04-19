import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useChatUnread } from '../../context/ChatUnreadContext';
import { getBookingMessages, markBookingChatRead } from '../../services/api';
import './BookingChat.css';

const formatTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

const BookingChatPanel = ({ bookingId, peerLabel, className = '', embedded = false }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const { refresh: refreshUnread } = useChatUnread();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);
  const markReadTimerRef = useRef(null);

  const markRead = useCallback(async () => {
    if (!bookingId) return;
    try {
      await markBookingChatRead(bookingId);
      await refreshUnread();
    } catch {
      /* ignore */
    }
  }, [bookingId, refreshUnread]);

  const scheduleMarkRead = useCallback(() => {
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(() => {
      markReadTimerRef.current = null;
      markRead();
    }, 450);
  }, [markRead]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    getBookingMessages(bookingId)
      .then(({ data }) => {
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
        if (!cancelled) markRead();
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Could not load messages');
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, markRead]);

  useEffect(() => {
    if (!socket || !bookingId) return;

    const onConnect = () => {
      setConnected(true);
      socket.emit('chat:join', { bookingId });
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    if (socket.connected) {
      setConnected(true);
      socket.emit('chat:join', { bookingId });
    }

    const onMessage = (payload) => {
      if (!payload || payload.booking_id !== bookingId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, payload];
      });
      setError('');
      if (user && payload.sender_user_id !== user.id) {
        scheduleMarkRead();
      }
    };

    const onChatError = (payload) => {
      if (payload?.error) setError(payload.error);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:message', onMessage);
    socket.on('chat:error', onChatError);

    return () => {
      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current);
        markReadTimerRef.current = null;
      }
      if (bookingId) socket.emit('chat:leave', { bookingId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:message', onMessage);
      socket.off('chat:error', onChatError);
    };
  }, [socket, bookingId, user, scheduleMarkRead]);

  const send = () => {
    const text = input.trim();
    if (!text || !socket || !bookingId) return;
    setError('');
    socket.emit('chat:send', { bookingId, text });
    setInput('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const mine = (m) => user && m.sender_user_id === user.id;

  return (
    <div className={`bc-wrap ${embedded ? 'bc-wrap--embedded' : ''} ${className}`.trim()}>
      <div className="bc-header">
        <h3 className="bc-header-title">
          <i className="fas fa-comments" aria-hidden />
          {peerLabel || 'Conversation'}
        </h3>
        <span className={`bc-live ${connected ? 'bc-live--on' : ''}`}>
          <span className="bc-live-dot" aria-hidden />
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      {error && !loading && <div className="bc-error">{error}</div>}

      <div className="bc-messages">
        {loading ? (
          <div className="bc-loading">
            <i className="fas fa-spinner fa-spin" aria-hidden />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="bc-empty">
            <i className="fas fa-paper-plane" aria-hidden />
            <p>No messages yet.</p>
            <p style={{ fontSize: '0.85rem', marginTop: 6 }}>Say hello to coordinate your service.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`bc-row ${mine(m) ? 'bc-row--mine' : 'bc-row--theirs'}`}>
              <div>
                <div className={`bc-bubble ${mine(m) ? 'bc-bubble--mine' : 'bc-bubble--theirs'}`}>
                  {m.body}
                </div>
                <div className={`bc-meta ${mine(m) ? 'bc-meta--mine' : 'bc-meta--theirs'}`}>
                  {mine(m) ? 'You' : m.sender_role === 'mechanic' ? 'Mechanic' : 'Customer'} ·{' '}
                  {formatTime(m.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="bc-footer">
        <textarea
          className="bc-input"
          rows={1}
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading || !bookingId}
          maxLength={2000}
          aria-label="Message"
        />
        <button
          type="button"
          className="bc-send"
          onClick={send}
          disabled={loading || !input.trim() || !bookingId}
          aria-label="Send message"
        >
          <i className="fas fa-paper-plane" />
        </button>
      </div>
    </div>
  );
};

export default BookingChatPanel;
