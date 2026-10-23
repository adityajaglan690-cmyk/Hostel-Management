import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (!socket) {
    socket = io('/', {
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
