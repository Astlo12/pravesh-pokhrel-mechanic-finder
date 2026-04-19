import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSocket } from './SocketContext';
import { getChatUnreadSummary } from '../services/api';

const ChatUnreadContext = createContext({
  total: 0,
  byBooking: {},
  refresh: async () => {},
  countForBooking: () => 0,
});

export function ChatUnreadProvider({ children, user }) {
  const socket = useSocket();
  const [total, setTotal] = useState(0);
  const [byBooking, setByBooking] = useState({});

  const refresh = useCallback(async () => {
    if (!user || (user.user_type !== 'customer' && user.user_type !== 'mechanic')) {
      setTotal(0);
      setByBooking({});
      return;
    }
    try {
      const { data } = await getChatUnreadSummary();
      setTotal(typeof data?.total === 'number' ? data.total : 0);
      setByBooking(data?.byBooking && typeof data.byBooking === 'object' ? data.byBooking : {});
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket || !user) return;
    const onUnread = () => {
      refresh();
    };
    socket.on('chat:unread-refresh', onUnread);
    return () => socket.off('chat:unread-refresh', onUnread);
  }, [socket, user, refresh]);

  const countForBooking = useCallback(
    (bookingId) => {
      if (!bookingId) return 0;
      const key = String(bookingId);
      const n = byBooking[key];
      return typeof n === 'number' ? n : 0;
    },
    [byBooking]
  );

  const value = useMemo(
    () => ({
      total,
      byBooking,
      refresh,
      countForBooking,
    }),
    [total, byBooking, refresh, countForBooking]
  );

  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

export function useChatUnread() {
  return useContext(ChatUnreadContext);
}
