import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hostel_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [student, setStudent] = useState(() => {
    const saved = localStorage.getItem('hostel_student');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('hostel_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('hostel_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/profile');
          if (res.data.success) {
            setUser(res.data.user);
            setStudent(res.data.student);
            initSocket(storedToken);
          }
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (college_id, password, role) => {
    const res = await api.post('/auth/login', { college_id, password, role });
    if (res.data.success) {
      const { token: newToken, user: newUser, student: newStudent } = res.data;
      localStorage.setItem('hostel_token', newToken);
      localStorage.setItem('hostel_user', JSON.stringify(newUser));
      if (newStudent) {
        localStorage.setItem('hostel_student', JSON.stringify(newStudent));
      }
      setToken(newToken);
      setUser(newUser);
      setStudent(newStudent || null);
      initSocket(newToken);
      return { success: true, user: newUser };
    }
    return { success: false, message: res.data.message };
  };

  const registerStudent = async (formData) => {
    const res = await api.post('/auth/register', formData);
    if (res.data.success) {
      const { token: newToken, user: newUser, student: newStudent } = res.data;
      localStorage.setItem('hostel_token', newToken);
      localStorage.setItem('hostel_user', JSON.stringify(newUser));
      localStorage.setItem('hostel_student', JSON.stringify(newStudent));
      setToken(newToken);
      setUser(newUser);
      setStudent(newStudent);
      initSocket(newToken);
      return { success: true };
    }
    return { success: false, message: res.data.message };
  };

  const logout = () => {
    localStorage.removeItem('hostel_token');
    localStorage.removeItem('hostel_user');
    localStorage.removeItem('hostel_student');
    disconnectSocket();
    setToken(null);
    setUser(null);
    setStudent(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data.success) {
        setUser(res.data.user);
        setStudent(res.data.student);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        token,
        role: user?.role || null,
        loading,
        login,
        logout,
        registerStudent,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
