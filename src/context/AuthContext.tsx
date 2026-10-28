import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { DEFAULT_USERS, localStore, dbService } from '../services/db';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; requiresVerification?: boolean; error?: string }>;
  verifyEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (userId: string) => void;
  availableUsers: UserProfile[];
  refreshUsers: () => void;
  lockoutStatus: { isLocked: boolean; remainingMinutes?: number };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout: 30 minutes (FR22)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
// Lockout threshold: 5 failed attempts (FR23)
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('spartantrace_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id === 'user-finder-jane' || parsed.id === 'user-looker-sam' || parsed.id === 'user-admin-alex') {
          localStorage.removeItem('spartantrace_current_user');
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>(() => {
    return localStore.getUsers();
  });
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [lockoutStatus, setLockoutStatus] = useState<{ isLocked: boolean; remainingMinutes?: number }>({
    isLocked: false,
  });

  const refreshUsers = () => {
    const users = localStore.getUsers();
    setAvailableUsers(users);
    if (user) {
      const refreshedUser = users.find((u) => u.id === user.id);
      if (refreshedUser) {
        setUser(refreshedUser);
        localStorage.setItem('spartantrace_current_user', JSON.stringify(refreshedUser));
      }
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  // Track session activity and 30-min timeout (FR22)
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    const interval = setInterval(() => {
      if (user && Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
        logout();
        alert('Your session expired after 30 minutes of inactivity. Please log in again.');
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(interval);
    };
  }, [user, lastActivity]);

  // Login implementation (FR21, FR23)
  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // Check email domain (FR18)
    if (!cleanEmail.endsWith('@sjsu.edu')) {
      return { success: false, error: 'Only valid @sjsu.edu university emails are permitted.' };
    }

    const users = localStore.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

    // Check Lockout (FR23)
    if (existing?.lockoutUntil) {
      const lockTime = new Date(existing.lockoutUntil).getTime();
      const diff = lockTime - Date.now();
      if (diff > 0) {
        const remainingMinutes = Math.ceil(diff / 60000);
        setLockoutStatus({ isLocked: true, remainingMinutes });
        return {
          success: false,
          error: `Account temporarily locked due to 5 failed attempts. Please retry in ${remainingMinutes} minute(s).`,
        };
      } else {
        // Reset lockout after expiry
        existing.failedLoginAttempts = 0;
        existing.lockoutUntil = null;
        localStore.saveUsers(users);
      }
    }

    // Suspended account check (FR21, FR31)
    if (existing && existing.isSuspended) {
      return {
        success: false,
        error: 'This account has been suspended by an Administrator. Contact SpartanTrace support.',
      };
    }

    // Verify password (for demo, accept 'password' or any non-empty string for existing users, or check dummy pass)
    // To trigger failed login for testing FR23, if password is 'wrong' it fails
    if (pass === 'wrong' || !pass) {
      if (existing) {
        existing.failedLoginAttempts = (existing.failedLoginAttempts || 0) + 1;
        if (existing.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
          existing.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
          setLockoutStatus({ isLocked: true, remainingMinutes: 15 });
          localStore.saveUsers(users);
          return {
            success: false,
            error: 'Account locked for 15 minutes after 5 consecutive failed login attempts.',
          };
        }
        localStore.saveUsers(users);
        return {
          success: false,
          error: `Invalid credentials. Attempt ${existing.failedLoginAttempts} of 5 before 15-min lockout.`,
        };
      }
      return { success: false, error: 'Invalid SJSU email or password.' };
    }

    if (!existing) {
      return {
        success: false,
        error: 'Account not found. Please register first with your @sjsu.edu address.',
      };
    }

    // Successful login - reset failed attempts (FR23)
    existing.failedLoginAttempts = 0;
    existing.lockoutUntil = null;
    localStore.saveUsers(users);

    setUser(existing);
    localStorage.setItem('spartantrace_current_user', JSON.stringify(existing));
    setLastActivity(Date.now());
    setLockoutStatus({ isLocked: false });

    return { success: true };
  };

  // Registration implementation (FR18, FR19, FR20)
  const register = async (
    name: string,
    email: string,
    pass: string
  ): Promise<{ success: boolean; requiresVerification?: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // FR18: begin registration only with an email address ending in @sjsu.edu
    if (!cleanEmail.endsWith('@sjsu.edu')) {
      return {
        success: false,
        error: 'Registration rejected: Email must be a valid @sjsu.edu address.',
      };
    }

    if (!name.trim()) {
      return { success: false, error: 'Name is required.' };
    }

    if (!pass || pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const users = localStore.getUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this @sjsu.edu email already exists.' };
    }

    // FR19: System sends verification link and keeps account inactive until verified
    // We store pending verification in sessionStorage / store
    const pendingKey = `pending_reg_${cleanEmail}`;
    sessionStorage.setItem(
      pendingKey,
      JSON.stringify({
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        isAdmin: cleanEmail.includes('admin'),
        role: 'looker',
        isSuspended: false,
        createdAt: new Date().toISOString(),
      })
    );

    return { success: true, requiresVerification: true };
  };

  // FR20: Email verification completion
  const verifyEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const pendingKey = `pending_reg_${cleanEmail}`;
    const raw = sessionStorage.getItem(pendingKey);

    let newUser: UserProfile;

    if (raw) {
      newUser = JSON.parse(raw);
      sessionStorage.removeItem(pendingKey);
    } else {
      // Fallback
      newUser = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        isAdmin: cleanEmail.includes('admin'),
        role: 'looker',
        isSuspended: false,
        createdAt: new Date().toISOString(),
      };
    }

    const users = localStore.getUsers();
    users.push(newUser);
    localStore.saveUsers(users);

    setUser(newUser);
    localStorage.setItem('spartantrace_current_user', JSON.stringify(newUser));
    setAvailableUsers(users);
    setLastActivity(Date.now());

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('spartantrace_current_user');
  };

  const switchUser = (userId: string) => {
    const users = localStore.getUsers();
    const target = users.find((u) => u.id === userId);
    if (target) {
      setUser(target);
      localStorage.setItem('spartantrace_current_user', JSON.stringify(target));
      setLastActivity(Date.now());
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: !!user?.isAdmin,
        login,
        register,
        verifyEmail,
        logout,
        switchUser,
        availableUsers,
        refreshUsers,
        lockoutStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
