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
  Tag,
} from 'lucide-react';
import { Listing, Claim } from '../types';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { dbService } from '../services/db';
import { formatDate, formatRelativeTime, getCampusPlaceholderImage } from '../utils/formatters';

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

  const getStatusBadge = () => {
    switch (listing.status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Claimed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Returned':
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
      default:
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-lg">
              {listing.category}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getStatusBadge()}`}>
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

        {/* Body - Scrollable */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Image / Thumbnail (Constrained & Proportional) */}
            <div className="w-full sm:w-48 h-44 sm:h-48 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
              <img
                src={listing.photoUrl || getCampusPlaceholderImage(listing.category, listing.title)}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getCampusPlaceholderImage(listing.category, listing.title);
                }}
              />
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0 space-y-2.5">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug">
                {listing.title}
              </h2>

              <div className="space-y-1 text-xs text-neutral-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-sjsu-600 shrink-0" />
                  <span>{listing.locationFound}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Found on {formatDate(listing.dateFound)} ({formatRelativeTime(listing.createdAt)})</span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-xs text-neutral-700 leading-relaxed whitespace-pre-line">
                {listing.description}
              </div>

              <div className="text-[11px] text-neutral-400 pt-0.5">
                Reported by <span className="font-semibold text-neutral-700">{listing.finderName}</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          {!isOwner && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-100">
              <div className="text-[11px] text-neutral-500">
                To claim, describe proof of ownership only the true owner would know.
              </div>

              <button
                onClick={() => onOpenClaimModal(listing)}
                disabled={listing.status === 'Returned'}
                className="w-full sm:w-auto px-5 py-2.5 bg-sjsu-600 hover:bg-sjsu-700 disabled:bg-neutral-200 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Ownership Claim</span>
              </button>
            </div>
          )}

          {/* Owner Management Controls */}
          {isOwner && (
            <div className="pt-3 border-t border-neutral-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Finder Controls
                </span>
                <button
                  onClick={() => onOpenEditModal(listing)}
                  className="text-xs font-semibold text-sjsu-600 hover:text-sjsu-700 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Listing</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-500">Change Status:</span>
                {(['Available', 'Pending', 'Returned'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(st)}
                    disabled={statusActionLoading || listing.status === st}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      listing.status === st
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Claims Received */}
              {claims.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-neutral-800">
                    Claims Received ({claims.length})
                  </span>
                  <div className="space-y-2">
                    {claims.map((claim) => (
                      <div
                        key={claim.id}
                        className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-900">{claim.claimantName}</span>
                          <span className="text-[10px] font-semibold text-neutral-500">{claim.status}</span>
                        </div>
                        <p className="text-neutral-600 text-xs italic">"{claim.proofDescription}"</p>
                        <div className="flex items-center gap-2 pt-1">
                          {claim.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleClaimStatusChange(claim.id, 'Accepted')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                              >
                                Accept Claim
                              </button>
                              <button
                                onClick={() => handleClaimStatusChange(claim.id, 'Rejected')}
                                className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-lg text-xs font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={async () => {
                              onClose();
                              await openChatForClaim(claim.id);
                            }}
                            className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Message</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Report inappropriate item button */}
          <div className="pt-1 text-right">
            <button
              onClick={() => {
                onClose();
                onOpenReportModal('listing', listing.id, listing.finderId, listing.finderName, listing.title);
              }}
              className="text-[11px] text-neutral-400 hover:text-red-600 transition-colors inline-flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Report violation or inaccurate listing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
