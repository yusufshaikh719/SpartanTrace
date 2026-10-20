import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { login, register, verifyEmail, switchUser, availableUsers, lockoutStatus } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationPendingEmail, setVerificationPendingEmail] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await register(name, email, password);
    setLoading(false);

    if (res.success) {
      if (res.requiresVerification) {
        setVerificationPendingEmail(email.trim().toLowerCase());
        setMode('verify');
      } else {
        onClose();
      }
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    const res = await verifyEmail(verificationPendingEmail);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Verification failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900">
            {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create Account' : 'Verify Email'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lockout Warning */}
        {lockoutStatus.isLocked && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p>
              Account temporarily locked. Retry in {lockoutStatus.remainingMinutes || 15} minutes.
            </p>
          </div>
        )}

        <div className="p-6 space-y-4">
          {mode === 'verify' ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 bg-neutral-100 text-neutral-800 rounded-2xl flex items-center justify-center mx-auto">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Verify your SJSU email</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Sent confirmation to <span className="font-semibold text-neutral-800">{verificationPendingEmail}</span>.
                </p>
              </div>
              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Email Address'}
              </button>
            </div>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  SJSU Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="name@sjsu.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-xs border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full text-xs border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-neutral-900"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Need an account? Register with @sjsu.edu
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Jane Spartan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full text-xs border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  SJSU Email (@sjsu.edu)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="name@sjsu.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-xs border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full text-xs border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-neutral-900"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors"
              >
                {loading ? 'Creating...' : 'Register Account'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}

          {/* Quick Sign-In Option */}
          <div className="border-t border-neutral-100 pt-3">
            <p className="text-[11px] font-semibold text-neutral-400 mb-2">
              Quick Accounts:
            </p>
            <div className="space-y-1">
              {availableUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    switchUser(u.id);
                    onClose();
                  }}
                  className="w-full py-1.5 px-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-xs flex items-center justify-between text-neutral-700 transition-colors"
                >
                  <span className="font-medium">{u.name}</span>
                  <span className="text-[10px] text-neutral-400 capitalize">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
