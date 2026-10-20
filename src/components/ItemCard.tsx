import React from 'react';
import { MapPin, Clock, Tag } from 'lucide-react';
import { Listing } from '../types';
import { formatRelativeTime } from '../utils/formatters';

interface ItemCardProps {
  listing: Listing;
  onClick: () => void;
  isOwner?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ listing, onClick, isOwner }) => {
  const getStatusBadge = () => {
    switch (listing.status) {
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-md text-emerald-700 border border-emerald-200/80 font-semibold text-[11px] px-2 py-0.5 rounded-md shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-md text-amber-700 border border-amber-200/80 font-semibold text-[11px] px-2 py-0.5 rounded-md shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending Claim
          </span>
        );
      case 'Claimed':
        return (
          <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-md text-blue-700 border border-blue-200/80 font-semibold text-[11px] px-2 py-0.5 rounded-md shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Claimed
          </span>
        );
      case 'Returned':
        return (
          <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-md text-slate-600 border border-slate-200 font-semibold text-[11px] px-2 py-0.5 rounded-md shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Returned ✓
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col h-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
        <img
          src={listing.photoUrl}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Top Floating Status Indicator */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {getStatusBadge()}
          {isOwner && (
            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
              Your report
            </span>
          )}
        </div>
      </div>

      {/* Item Information */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 group-hover:text-sjsu-500 transition-colors leading-snug">
            {listing.title}
          </h3>

          <div className="flex items-center text-xs text-slate-500 mt-2 gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sjsu-500 shrink-0" />
            <span className="truncate">{listing.locationFound}</span>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="text-slate-600 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded text-[11px] truncate max-w-[130px]">
            {listing.category}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formatRelativeTime(listing.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
