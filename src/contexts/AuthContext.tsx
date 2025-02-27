'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userWallet: string | null;
  login: (token: string) => void;
  logout: () => void;
  checkAuthStatus: () => Promise<boolean>;
  getPrivateKey: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userWallet, setUserWallet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on initial load
  useEffect(() => {
    const checkAuth = async () => {
      await checkAuthStatus();
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = (token: string) => {
    // Store token in localStorage for persistence
    localStorage.setItem('auth_token', token);
    setIsAuthenticated(true);
    
    // Fetch user data immediately after login
    fetchUserData();
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setUserWallet(null);
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/user/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUserWallet(userData.wallet_address);
        console.log('User data fetched successfully:', userData);
      } else {
        console.error('Failed to fetch user data');
        logout(); // Clear invalid auth state
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      setIsAuthenticated(false);
      return false;
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/user/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUserWallet(userData.wallet_address);
        setIsAuthenticated(true);
        return true;
      } else {
        // Token is invalid
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      return false;
    }
  };

  const getPrivateKey = async (): Promise<string | null> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No authentication token found');
        return null;
      }
      
      console.log('Fetching private key with token:', token.substring(0, 10) + '...');
      
      const response = await fetch('http://localhost:8000/api/user/private-key', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('Private key response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch private key:', response.status, errorText);
        
        // If wallet not found, use a temporary hardcoded private key for testing
        if (response.status === 404 && errorText.includes("Wallet not found")) {
          console.warn("Using temporary private key for testing");
          return "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Default Hardhat private key
        }
        
        return null;
      }
      
      const data = await response.json();
      console.log('Private key retrieved successfully');
      return data.private_key;
    } catch (error) {
      console.error('Error fetching private key:', error);
      return null;
    }
  };

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userWallet, 
      login, 
      logout,
      checkAuthStatus,
      getPrivateKey
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 