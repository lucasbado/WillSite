import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      const { access_token, role, user_name } = response.data;
      
      localStorage.setItem('token', access_token);
      setUser({ name: user_name, role });
      
      // Configura o token para todas as próximas chamadas Axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
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