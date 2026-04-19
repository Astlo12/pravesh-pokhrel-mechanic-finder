import React, { createContext, useState, useEffect } from 'react';
import {
  login as loginApi,
  register as registerApi,
  getMechanicProfileId,
  getMechanicProfile,
  setMechanicOnline,
} from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // If user is a mechanic, set them as online on app load
      if (parsedUser.user_type === 'mechanic') {
        getMechanicProfileId()
          .then(async (response) => {
            const mechanicId = response.data.mechanicId;
            if (!mechanicId) return;
            try {
              const prof = await getMechanicProfile(mechanicId);
              if (prof.data?.is_verified) {
                await setMechanicOnline(mechanicId, true);
              }
            } catch (error) {
              console.error('Error setting mechanic online on load:', error);
            }
          })
          .catch((error) => {
            console.error('Error fetching mechanic ID on load:', error);
          });
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await loginApi({ email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      // If user is a mechanic, set them as online
      if (user.user_type === 'mechanic') {
        try {
          const mechanicResponse = await getMechanicProfileId();
          const mechanicId = mechanicResponse.data.mechanicId;
          if (mechanicId) {
            const prof = await getMechanicProfile(mechanicId);
            if (prof.data?.is_verified) {
              await setMechanicOnline(mechanicId, true);
            }
          }
        } catch (error) {
          console.error('Error setting mechanic online:', error);
        }
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await registerApi(userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    // If user is a mechanic, set them as offline before logout
    const currentUser = user || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);
    
    if (currentUser && currentUser.user_type === 'mechanic') {
      try {
        const mechanicResponse = await getMechanicProfileId();
        const mechanicId = mechanicResponse.data.mechanicId;
        if (mechanicId) {
          await setMechanicOnline(mechanicId, false);
        }
      } catch (error) {
        console.error('Error setting mechanic offline:', error);
        // Continue with logout even if this fails
      }
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

