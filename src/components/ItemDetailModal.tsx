import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  AlertTriangle,
  MessageCircle,
  Edit3,
  CheckCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Listing, Claim } from '../types';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { dbService } from '../services/db';
import { formatDate, formatRelativeTime } from '../utils/formatters';

interface ItemDetailModalProps {
  listing: Listing | null;
  onClose: () => void;
  onOpenClaimModal: (listing: Listing) => void;
  onOpenEditModal: (listing: Listing) => void;
  onOpenReportModal: (type: 'listing', id: string, ownerId: string, ownerName: string, snippet: string) => void;
  onListingUpdated: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  listing,
  onClose,
  onOpenClaimModal,
  onOpenEditModal,
  onOpenReportModal,
  onListingUpdated,
}) => {
  const { user } = useAuth();
  const { openChatForClaim } = useChat();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  const isOwner = user && listing && user.id === listing.finderId;

  useEffect(() => {
    if (listing && isOwner) {
      loadClaims();
    }
  }, [listing?.id, isOwner]);

  const loadClaims = async () => {
    if (!listing) return;
    setIsLoadingClaims(true);
    const data = await dbService.getClaimsForListing(listing.id);
    setClaims(data);
    setIsLoadingClaims(false);
  };

  if (!listing) return null;

  const handleUpdateStatus = async (newStatus: Listing['status']) => {
    if (!listing || !isOwner) return;
    setStatusActionLoading(true);
    try {
      await dbService.updateListingStatus(listing.id, newStatus);
      onListingUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleClaimStatusChange = async (claimId: string, newStatus: 'Accepted' | 'Rejected') => {
    try {
      await dbService.updateClaimStatus(claimId, newStatus);
      if (newStatus === 'Accepted') {
        await dbService.updateListingStatus(listing.id, 'Claimed');
        onListingUpdated();
      }
      loadClaims();
    } catch (err: any) {
      alert(err.message || 'Failed to update claim');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
              {listing.category}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                listing.status === 'Available'
                  ? 'bg-emerald-50 text-emerald-700'
                  : listing.status === 'Pending'
                  ? 'bg-amber-50 text-amber-700'
                  : listing.status === 'Claimed'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {listing.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Image */}
            <div className="relative rounded-2xl overflow-hidden bg-neutral-100 aspect-4/3 w-full border border-neutral-200">
              <img
                src={listing.photoUrl}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
                }}
              />
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-snug">
                  {listing.title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>{listing.locationFound}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Found {formatDate(listing.dateFound)}</span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100 text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                {listing.description}
              </div>

              {/* Finder Info */}
              <div className="flex items-center justify-between text-xs text-neutral-600 pt-1">
                <span>Reported by <strong>{listing.finderName}</strong></span>
                <span className="text-neutral-400">{formatRelativeTime(listing.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="pt-2 space-y-2">
                {!isOwner ? (
                  <>
                    {listing.status === 'Available' ? (
                      <button
                        onClick={() => onOpenClaimModal(listing)}
                        className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Claim this item</span>
                      </button>
                    ) : (
                      <div className="p-2.5 bg-neutral-100 rounded-xl text-xs text-neutral-500 text-center font-medium">
                        Not currently accepting claims
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {listing.status !== 'Returned' && (
                        <button
                          onClick={() => onOpenEditModal(listing)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium rounded-xl text-xs transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      {listing.status === 'Available' && (
                        <button
                          disabled={statusActionLoading}
                          onClick={() => handleUpdateStatus('Pending')}
                          className="flex items-center justify-center py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl text-xs transition-colors"
                        >
                          Mark Pending
                        </button>
                      )}

                      {listing.status === 'Pending' && (
                        <button
                          disabled={statusActionLoading}
                          onClick={() => handleUpdateStatus('Claimed')}
                          className="flex items-center justify-center py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition-colors"
                        >
                          Mark Claimed
                        </button>
                      )}

                      {listing.status === 'Claimed' && (
                        <button
                          disabled={statusActionLoading}
                          onClick={() => handleUpdateStatus('Returned')}
                          className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark as Returned</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
                  <button
                    onClick={() =>
                      onOpenReportModal('listing', listing.id, listing.finderId, listing.finderName, listing.title)
                    }
                    className="text-neutral-400 hover:text-red-600 hover:underline flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Claims List (Owner only) */}
          {isOwner && (
            <div className="border-t border-neutral-100 pt-5 mt-4 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                Claims ({claims.length})
              </h3>

              {isLoadingClaims ? (
                <div className="py-4 text-center text-xs text-neutral-400">Loading claims...</div>
              ) : claims.length === 0 ? (
                <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl text-xs text-neutral-500 text-center">
                  No claims submitted for this item yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-3.5 bg-neutral-50 border border-neutral-200/60 rounded-xl text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-neutral-900">{claim.claimantName}</span>
                          <span className="text-neutral-400 ml-2">{claim.claimantEmail}</span>
                        </div>
                        <button
                          onClick={() => {
                            openChatForClaim(claim.id);
                            onClose();
                          }}
                          className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Message</span>
                        </button>
                      </div>

                      <p className="text-neutral-700 italic">"{claim.proofDescription}"</p>

                      {claim.status === 'Pending' && (
                        <div className="flex items-center gap-2 pt-1 justify-end">
                          <button
                            onClick={() => handleClaimStatusChange(claim.id, 'Rejected')}
                            className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleClaimStatusChange(claim.id, 'Accepted')}
                            className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold"
                          >
                            Accept
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
