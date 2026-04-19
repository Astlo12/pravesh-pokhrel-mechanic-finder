import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext();

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token') || '';
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: { token },
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [user]);

  // Join per-user room for in-app notification refresh events
  useEffect(() => {
    if (!user?.id || !socket) return;
    const join = () => {
      socket.emit('notifications:join', { userId: user.id });
    };
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [user, socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const socket = React.useContext(SocketContext);
  return socket;
};

