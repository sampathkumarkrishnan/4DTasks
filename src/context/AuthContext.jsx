import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

// Google OAuth configuration
// You'll need to replace this with your own Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
].join(' ');

// Refresh token 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
// Timeout for silent refresh attempt
const SILENT_REFRESH_TIMEOUT_MS = 3000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);
  
  // Refs to track timers and pending refresh
  const refreshTimerRef = useRef(null);
  const silentRefreshTimeoutRef = useRef(null);
  const pendingSilentRefreshRef = useRef(false);

  // Schedule proactive token refresh before expiry
  const scheduleTokenRefresh = useCallback((expiresInMs) => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    // Schedule refresh 5 minutes before expiry
    const refreshTime = expiresInMs - REFRESH_BUFFER_MS;
    if (refreshTime > 0) {
      refreshTimerRef.current = setTimeout(() => {
        console.log('Proactively refreshing token before expiry');
        if (tokenClient) {
          tokenClient.requestAccessToken({ prompt: '' });
        }
      }, refreshTime);
    }
  }, [tokenClient]);

  // Attempt silent token refresh (no user interaction)
  const attemptSilentRefresh = useCallback((client) => {
    pendingSilentRefreshRef.current = true;
    
    // Try to get a new token silently
    client.requestAccessToken({ prompt: '' });
    
    // Set a timeout - if we don't get a response, show login screen
    silentRefreshTimeoutRef.current = setTimeout(() => {
      if (pendingSilentRefreshRef.current) {
        console.log('Silent refresh timed out, showing login');
        pendingSilentRefreshRef.current = false;
        setIsLoading(false);
      }
    }, SILENT_REFRESH_TIMEOUT_MS);
  }, []);

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
          callback: (response) => handleTokenResponse(response, client),
        });
        setTokenClient(client);
        
        // Check if we have a stored token
        const storedToken = localStorage.getItem('google_access_token');
        const storedExpiry = localStorage.getItem('google_token_expiry');
        const storedUser = localStorage.getItem('google_user');
        
        if (storedToken && storedExpiry) {
          const expiryDate = new Date(storedExpiry);
          const now = new Date();
          
          if (expiryDate > now) {
            // Token still valid - use it
            setAccessToken(storedToken);
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
            // Schedule refresh before it expires
            const remainingTime = expiryDate.getTime() - now.getTime();
            scheduleTokenRefresh(remainingTime);
            setIsLoading(false);
          } else {
            // Token expired - attempt silent refresh
            console.log('Stored token expired, attempting silent refresh');
            if (storedUser) {
              setUser(JSON.parse(storedUser)); // Show user info while refreshing
            }
            attemptSilentRefresh(client);
            return; // Don't set isLoading false yet
          }
        } else {
          setIsLoading(false);
        }
      };
      script.onerror = () => {
        setError('Failed to load Google Identity Services');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    initializeGoogleAuth();
    
    // Cleanup timers on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (silentRefreshTimeoutRef.current) {
        clearTimeout(silentRefreshTimeoutRef.current);
      }
    };
  }, []);

  const handleTokenResponse = useCallback((response, client) => {
    // Clear silent refresh state
    pendingSilentRefreshRef.current = false;
    if (silentRefreshTimeoutRef.current) {
      clearTimeout(silentRefreshTimeoutRef.current);
    }
    
    if (response.error) {
      console.error('Token response error:', response.error);
      setError(response.error);
      setIsLoading(false);
      return;
    }

    const token = response.access_token;
    setAccessToken(token);
    setIsLoading(false);
    
    // Store token with expiry
    const expiresInMs = response.expires_in * 1000;
    const expiryDate = new Date(Date.now() + expiresInMs);
    localStorage.setItem('google_access_token', token);
    localStorage.setItem('google_token_expiry', expiryDate.toISOString());
    
    // Schedule proactive refresh before expiry
    scheduleTokenRefresh(expiresInMs);
    
    // Fetch user info
    fetchUserInfo(token);
  }, [scheduleTokenRefresh]);

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

