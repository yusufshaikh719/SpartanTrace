import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice(''); setLoading(true);
    try {
      const result = mode === 'login' ? await login(email, password) : await register(name, email, password);
      if (!result.success) setError(result.error || 'Unable to sign in.');
      else if (result.requiresVerification) {
        setNotice('Check your SJSU inbox for a verification link. Verify your address, then sign in.');
        setMode('login'); setPassword('');
      } else onClose();
    } finally { setLoading(false); }
  };
  const inputStyle = 'w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5';
  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="auth-title" className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5">
      <div className="flex justify-between items-center">
        <h2 id="auth-title" className="font-bold">{mode === 'login' ? 'Sign in to SpartanTrace' : 'Create your account'}</h2>
        <button onClick={onClose} aria-label="Close sign in"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && <label className="block text-xs font-semibold">Full name<input autoComplete="name" required className={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></label>}
        <label className="block text-xs font-semibold">SJSU email<input autoFocus autoComplete="email" type="email" placeholder="name@sjsu.edu" required className={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block text-xs font-semibold">Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" minLength={mode === 'register' ? 8 : 1} required className={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
        <button disabled={loading} className="w-full bg-sjsu-600 text-white font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50">{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register and verify email'}</button>
      </form>
      <button className="text-xs text-sjsu-600" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}</button>
    </div>
  </div>;
};
