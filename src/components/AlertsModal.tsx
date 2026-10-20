import React, { useState, useEffect } from 'react';
import { X, Sparkles, Bell, Plus, Trash2, MapPin, Tag, AlertCircle } from 'lucide-react';
import { LostItemAlert } from '../types';
import { ITEM_CATEGORIES, SJSU_LOCATIONS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';

interface AlertsModalProps {
  onClose: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<LostItemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadAlerts();
    }
  }, [user]);

  const loadAlerts = async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await dbService.getAlerts(user.id);
    setAlerts(data);
    setIsLoading(false);
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!keywords.trim() && !category && !location) {
      setError('Please provide at least one keyword, category, or location.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await dbService.createAlert({
        userId: user.id,
        keywords: keywords.trim(),
        category: category || undefined,
        location: location || undefined,
      });

      setKeywords('');
      setCategory('');
      setLocation('');
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || 'Failed to save alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await dbService.deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-bold text-neutral-900">Lost Item Alerts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Create Alert */}
          <form onSubmit={handleCreateAlert} className="bg-neutral-50 border border-neutral-200/70 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-neutral-700">New Alert</h3>

            <div>
              <input
                type="text"
                placeholder="Keywords (e.g. AirPods, Hydro Flask, keys)..."
                value={keywords}
                onChange={(e) => {
                  setKeywords(e.target.value);
                  if (error) setError('');
                }}
                className="w-full text-xs border border-neutral-200 rounded-xl px-3 py-2 bg-white focus:outline-neutral-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs border border-neutral-200 rounded-xl px-2.5 py-2 bg-white focus:outline-neutral-900 text-neutral-700"
              >
                <option value="">Any Category</option>
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs border border-neutral-200 rounded-xl px-2.5 py-2 bg-white focus:outline-neutral-900 text-neutral-700"
              >
                <option value="">Any Location</option>
                {SJSU_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc.split('-')[0]}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs py-2 rounded-xl transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Add Alert'}
            </button>
          </form>

          {/* Active Alerts List */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 mb-2">Active Alerts</h3>

            {isLoading ? (
              <div className="text-center py-4 text-xs text-neutral-400">Loading...</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-400 bg-neutral-50 rounded-xl">
                No active alerts saved.
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 bg-white border border-neutral-200/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900">{a.keywords || 'Any keyword'}</p>
                      <p className="text-[11px] text-neutral-400">
                        {[a.category, a.location].filter(Boolean).join(' • ') || 'All categories'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
