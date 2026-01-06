import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// Google OAuth configuration
// You'll need to replace this with your own Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
].join(' ');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);

  // Initialize Google Identity Services
  useEffect(() => {
    const initializeGoogleAuth = () => {
      // Load the Google Identity Services library
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Initialize the token client for OAuth
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: handleTokenResponse,
        });
        setTokenClient(client);
        
        // Check if we have a stored token
        const storedToken = localStorage.getItem('google_access_token');
        const storedExpiry = localStorage.getItem('google_token_expiry');
        const storedUser = localStorage.getItem('google_user');
        
        if (storedToken && storedExpiry && new Date(storedExpiry) > new Date()) {
          setAccessToken(storedToken);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
        
        setIsLoading(false);
      };
      script.onerror = () => {
        setError('Failed to load Google Identity Services');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    initializeGoogleAuth();
  }, []);

  const handleTokenResponse = useCallback((response) => {
    if (response.error) {
      setError(response.error);
      return;
    }

    const token = response.access_token;
    setAccessToken(token);
    
    // Store token with expiry
    const expiryDate = new Date(Date.now() + response.expires_in * 1000);
    localStorage.setItem('google_access_token', token);
    localStorage.setItem('google_token_expiry', expiryDate.toISOString());
    
    // Fetch user info
    fetchUserInfo(token);
  }, []);

  const fetchUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const userInfo = await response.json();
        setUser(userInfo);
        localStorage.setItem('google_user', JSON.stringify(userInfo));
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const login = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  }, [tokenClient]);

  const logout = useCallback(() => {
    if (accessToken) {
      // Revoke the token
      window.google.accounts.oauth2.revoke(accessToken, () => {
        console.log('Token revoked');
      });
    }
    
    // Clear state and storage
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_user');
  }, [accessToken]);

  const refreshToken = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  }, [tokenClient]);

  const value = {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

