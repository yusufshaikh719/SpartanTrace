import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig } from '../lib/supabase';
import { dbService } from '../services/db';

interface SupabaseModalProps {
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ onClose, onConfigUpdated }) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setTestStatus('testing');
    const isConn = await dbService.isSupabaseConnected();
    if (isConn) {
      setTestStatus('connected');
    } else {
      setTestStatus(currentConfig.isConfigured ? 'error' : 'idle');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, key);
    onConfigUpdated();
    await checkConnection();
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setKey('');
    setTestStatus('idle');
    onConfigUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-neutral-800" />
            <h2 className="text-base font-bold text-neutral-900">Database Connection</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Status banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
              testStatus === 'connected'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : testStatus === 'error'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-neutral-50 border-neutral-200 text-neutral-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  testStatus === 'connected'
                    ? 'bg-emerald-500'
                    : testStatus === 'error'
                    ? 'bg-amber-500'
                    : 'bg-neutral-400'
                }`}
              />
              <span className="font-semibold">
                {testStatus === 'connected'
                  ? 'Connected to Supabase PostgreSQL'
                  : testStatus === 'error'
                  ? 'Unable to connect to Supabase'
                  : 'Local Storage Mode'}
              </span>
            </div>
            <button
              onClick={checkConnection}
              className="p-1 hover:bg-black/5 rounded text-neutral-500"
              title="Test Connection"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Project URL
              </label>
              <input
                type="url"
                placeholder="https://xyz.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full text-xs font-mono border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Public Anon Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOi..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full text-xs font-mono border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-neutral-900"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-neutral-500 hover:text-red-600 underline"
              >
                Reset to local storage
              </button>

              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs"
              >
                Save
              </button>
            </div>
          </form>

          {/* Setup notice */}
          <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 text-xs text-neutral-600 space-y-1.5">
            <p className="font-semibold text-neutral-900">Supabase Free Tier Setup</p>
            <p className="text-[11px] leading-relaxed">
              Run <code className="bg-neutral-200/60 px-1 py-0.5 rounded text-neutral-800 font-mono">supabase/schema.sql</code> in your Supabase SQL Editor, then paste your project credentials above or into <code className="bg-neutral-200/60 px-1 py-0.5 rounded text-neutral-800 font-mono">.env</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
