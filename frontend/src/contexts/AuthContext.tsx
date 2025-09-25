import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Types
interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'doctor' | 'admin' | 'researcher';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role?: 'doctor' | 'admin' | 'researcher';
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL - adjust this to match your backend
const API_BASE_URL = 'http://localhost:8000';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('userData');

        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Verify token is still valid by fetching user profile
          try {
            const response = await axios.get('/auth/me');
            setToken(storedToken);
            setUser(response.data);
          } catch (error) {
            // Token is invalid, clear stored data
            console.error('Token validation failed:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            delete axios.defaults.headers.common['Authorization'];
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);

      // Create form data for OAuth2 authentication
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      // Login request
      const loginResponse = await axios.post('/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, token_type } = loginResponse.data;

      if (!access_token) {
        throw new Error('No access token received');
      }

      // Set authorization header
      axios.defaults.headers.common['Authorization'] = `${token_type} ${access_token}`;

      // Get user profile
      const userResponse = await axios.get('/auth/me');
      const userData = userResponse.data;

      // Store in state
      setToken(access_token);
      setUser(userData);

      // Store in localStorage
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('userData', JSON.stringify(userData));

    } catch (error: any) {
      console.error('Login error:', error);
      
      // Clear any partial state
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);

      const registerData = {
        ...userData,
        role: userData.role || 'doctor', // Default to doctor role
      };

      // Register request
      const response = await axios.post('/auth/register', registerData);
      
      // Auto-login after successful registration
      await login(userData.username, userData.password);

    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    try {
      // Clear state
      setToken(null);
      setUser(null);

      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');

      // Clear axios default header
      delete axios.defaults.headers.common['Authorization'];

    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Computed values
  const isAuthenticated = !!token && !!user;

  // Context value
  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Helper function to get auth headers for manual axios calls
export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Axios interceptor to handle token expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      delete axios.defaults.headers.common['Authorization'];
      
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default AuthContext;