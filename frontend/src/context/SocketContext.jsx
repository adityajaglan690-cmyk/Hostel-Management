import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [liveScans, setLiveScans] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleScanEvent = (eventData) => {
      setLiveScans((prev) => [eventData, ...prev.slice(0, 24)]);
    };

    const handleNewNotification = (notification) => {
      setLiveAlerts((prev) => [notification, ...prev.slice(0, 19)]);
      setUnreadCount((c) => c + 1);
    };

    const handleGraceAlert = (data) => {
      setLiveAlerts((prev) => [
        {
          _id: Date.now(),
          type: 'GRACE_WARNING',
          title: 'Student Entered Grace Period',
          message: `${data.name} (${data.studentId}) is outside past expiry. In 15-min grace window until ${new Date(data.graceEnd).toLocaleTimeString()}`
        },
        ...prev
      ]);
      setUnreadCount((c) => c + 1);
    };

    const handleLateAlert = (data) => {
      setLiveAlerts((prev) => [
        {
          _id: Date.now(),
          type: 'LATE_RETURN',
          title: 'URGENT: Student Marked LATE',
          message: `${data.name} (${data.studentId}) has exceeded the 15-min grace period. Overdue by ${data.lateMinutes} mins!`
        },
        ...prev
      ]);
      setUnreadCount((c) => c + 1);
    };

    socket.on('scan_event', handleScanEvent);
    socket.on('new_notification', handleNewNotification);
    socket.on('role_notification', handleNewNotification);
    socket.on('student_in_grace', handleGraceAlert);
    socket.on('student_marked_late', handleLateAlert);

    return () => {
      socket.off('scan_event', handleScanEvent);
      socket.off('new_notification', handleNewNotification);
      socket.off('role_notification', handleNewNotification);
      socket.off('student_in_grace', handleGraceAlert);
      socket.off('student_marked_late', handleLateAlert);
    };
  }, [token]);

  const clearUnread = () => setUnreadCount(0);

  return (
    <SocketContext.Provider
      value={{
        liveScans,
        liveAlerts,
        unreadCount,
        clearUnread
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
