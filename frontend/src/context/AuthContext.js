import React, { createContext, useState, useContext } from 'react';
import api from '../pages/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, role, user_name } = response.data;
      
      sessionStorage.setItem('token', access_token);
      sessionStorage.setItem('role', role);
      sessionStorage.setItem('user_name', user_name);
      setUser({ name: user_name, role });
      
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.msg };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, authenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
