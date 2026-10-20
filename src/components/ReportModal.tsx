import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';

interface ReportModalProps {
  reportData: {
    contentType: 'listing' | 'message';
    contentId: string;
    ownerId: string;
    ownerName: string;
    contentSnippet: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  reportData,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!reportData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to report content.');
      return;
    }

    if (!reason.trim()) {
      setError('A reason is required before submitting a report.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await dbService.createReport({
        reporterId: user.id,
        reporterName: user.name,
        contentType: reportData.contentType,
        contentId: reportData.contentId,
        ownerId: reportData.ownerId,
        ownerName: reportData.ownerName,
        reason: reason.trim(),
        contentSnippet: reportData.contentSnippet,
      });

      alert('Report submitted for administrator review.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-neutral-900">
              Report Content
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Snippet */}
        <div className="p-4 bg-neutral-50 text-xs text-neutral-600 border-b border-neutral-100">
          <p className="italic line-clamp-2">"{reportData.contentSnippet}"</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Reason
            </label>
            <textarea
              rows={3}
              placeholder="Explain why this content should be removed..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              className="w-full text-xs border border-neutral-200 rounded-xl p-3 focus:outline-neutral-900"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
