import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginOfficer } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on app start
    AsyncStorage.getItem('officer_session')
      .then((data) => {
        if (data) setOfficer(JSON.parse(data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (badgeId, pin) => {
    const res = await loginOfficer(badgeId, pin);
    if (res.status === 'success' && res.officer) {
      const officerData = {
        badgeId: res.officer.badge_id,
        name: res.officer.name,
        rank: res.officer.rank,
      };
      setOfficer(officerData);
      await AsyncStorage.setItem('officer_session', JSON.stringify(officerData));
      return { success: true };
    }
    return { success: false, message: res.message || 'Login failed' };
  };

  const logout = async () => {
    setOfficer(null);
    await AsyncStorage.removeItem('officer_session');
  };

  return (
    <AuthContext.Provider value={{ officer, login, logout, isLoggedIn: !!officer, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
