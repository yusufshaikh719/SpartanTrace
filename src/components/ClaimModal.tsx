import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, Send } from 'lucide-react';
import { Listing } from '../types';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { dbService } from '../services/db';

interface ClaimModalProps {
  listing: Listing;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ listing, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { openChatWithConversation } = useChat();

  const [proofDescription, setProofDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in first.');
      return;
    }

    if (!proofDescription.trim() || proofDescription.trim().length < 10) {
      setError('Please provide at least 10 characters describing details only the true owner would know.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // FR14 & FR15
      const { conversation } = await dbService.createClaim({
        listingId: listing.id,
        claimantId: user.id,
        claimantName: user.name,
        claimantEmail: user.email,
        proofDescription: proofDescription.trim(),
      });

      onSuccess();
      onClose();

      // Automatically open DM conversation (FR15)
      await openChatWithConversation(conversation.id);
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Claim Item Ownership (FR14)</h2>
            <p className="text-xs text-slate-500">Provide proof to verify you are the rightful owner</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item preview snippet */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <img
            src={listing.photoUrl}
            alt={listing.title}
            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
          />
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-slate-900 truncate">{listing.title}</h4>
            <p className="text-[11px] text-slate-500">Reported by: {listing.finderName}</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Proof of Ownership Details *
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Scratches, serial number suffix, passcode description, lockscreen wallpaper, or items inside that were not shown in public photo..."
              value={proofDescription}
              onChange={(e) => {
                setProofDescription(e.target.value);
                if (error) setError('');
              }}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-sjsu-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Sent directly to {listing.finderName} to initiate a direct message conversation.
            </p>
            {error && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-sjsu-500 hover:bg-sjsu-600 active:bg-sjsu-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Claim & Open Chat'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
