import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Listing } from '../types';
import { formatRelativeTime } from '../utils/formatters';

interface ItemCardProps {
  listing: Listing;
  onClick: () => void;
  isOwner?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ listing, onClick, isOwner }) => {
  const getStatusColor = () => {
    switch (listing.status) {
      case 'Available':
        return 'bg-emerald-500';
      case 'Pending':
        return 'bg-amber-500';
      case 'Claimed':
        return 'bg-blue-500';
      case 'Returned':
        return 'bg-neutral-400';
      default:
        return 'bg-neutral-400';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-neutral-200/70 hover:border-neutral-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col h-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-4/3 w-full bg-neutral-100 overflow-hidden">
        <img
          src={listing.photoUrl}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Floating Discreet Status Indicator */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-neutral-800 shadow-2xs border border-neutral-100">
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
            <span>{listing.status}</span>
          </span>
        </div>

        {isOwner && (
          <div className="absolute top-2.5 right-2.5">
            <span className="bg-neutral-900/80 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
              Yours
            </span>
          </div>
        )}
      </div>

      {/* Item Meta */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-neutral-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
            {listing.title}
          </h3>

          <div className="flex items-center text-xs text-neutral-500 mt-1.5 gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="truncate">{listing.locationFound}</span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="text-neutral-600 font-medium truncate max-w-[120px]">
            {listing.category}
          </span>
          <span>{formatRelativeTime(listing.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};
