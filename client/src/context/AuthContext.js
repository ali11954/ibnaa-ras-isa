import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const TAB_IDS = ['dashboard', 'workers', 'families', 'citizens', 'feedback', 'subscribe'];

export const TAB_LABELS = {
  dashboard: 'لوحة التحكم',
  workers: 'كشف العمال',
  families: 'كشف المساعدات',
  citizens: 'إحصاء المواطنين',
  feedback: 'الملاحظات',
  subscribe: 'الاشتراك',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { setUser(res.data.user); setLoading(false); })
        .catch(() => { logout(); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await axios.post('/api/auth/login', { username, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    return u;
  };

  const register = async (data) => {
    const res = await axios.post('/api/auth/register', data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (tabId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!user.permissions || user.permissions.length === 0) return false;
    return user.permissions.includes(tabId);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin: user?.role === 'admin', isApproved: user?.approved || user?.role === 'admin', hasPermission, permissions: user?.permissions || [] }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);