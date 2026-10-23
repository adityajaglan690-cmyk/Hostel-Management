import { io } from 'socket.io-client';

let socket = null;

export const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.replace(/\/+$/, '');
  }
  if (import.meta.env.VITE_API_URL) {
    // Strip trailing /api or /api/ to get backend root host
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  return '/';
};

export const initSocket = (token) => {
  if (!socket) {
    const socketUrl = getSocketUrl();
    socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    if (token) {
      socket.emit('authenticate', token);
    }
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
