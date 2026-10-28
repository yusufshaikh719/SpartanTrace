import React from 'react';
import { MapPin, Clock, Tag } from 'lucide-react';
import { Listing } from '../types';
import { formatRelativeTime, formatDate, getCampusPlaceholderImage } from '../utils/formatters';

interface ItemCardProps {
  listing: Listing;
  onClick: () => void;
  isOwner?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ listing, onClick, isOwner }) => {
  const getStatusBadge = () => {
    switch (listing.status) {
      case 'Available':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Available',
        };
      case 'Pending':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'In Review',
        };
      case 'Claimed':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Claimed',
        };
      case 'Returned':
        return {
          bg: 'bg-neutral-100 text-neutral-600 border-neutral-200',
          dot: 'bg-neutral-400',
          label: 'Returned',
        };
      default:
        return {
          bg: 'bg-neutral-100 text-neutral-600 border-neutral-200',
          dot: 'bg-neutral-400',
          label: listing.status,
        };
    }
  };

  const status = getStatusBadge();

  return (
    <article
      onClick={onClick}
      className="group bg-white rounded-2xl border border-neutral-200/90 hover:border-sjsu-500/80 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col h-full"
    >
      {/* Thumbnail Header */}
      <div className="relative h-44 sm:h-48 w-full bg-slate-100 overflow-hidden shrink-0 border-b border-neutral-100">
        <img
          src={listing.photoUrl || getCampusPlaceholderImage(listing.category, listing.title)}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getCampusPlaceholderImage(listing.category, listing.title);
          }}
        />

        {/* Floating Status Pill */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md shadow-2xs ${status.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <span>{status.label}</span>
          </span>
        </div>

        {isOwner && (
          <div className="absolute top-2.5 right-2.5">
            <span className="bg-sjsu-navy text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30 shadow-2xs">
              Your Report
            </span>
          </div>
        )}

        {/* Bottom Time Stamp */}
        <div className="absolute bottom-2 right-2.5">
          <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
            <Clock className="w-3 h-3 text-neutral-300" />
            <span>{formatRelativeTime(listing.createdAt)}</span>
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-sjsu-600 uppercase tracking-wider">
            <Tag className="w-3 h-3 text-sjsu-500" />
            <span>{listing.category}</span>
          </div>

          <h3 className="font-bold text-sm text-neutral-900 line-clamp-2 leading-snug group-hover:text-sjsu-600 transition-colors">
            {listing.title}
          </h3>

          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
            {listing.description}
          </p>
        </div>

        {/* Footer Meta: Campus Location */}
        <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 text-neutral-600 font-medium truncate">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="truncate">{listing.locationFound}</span>
          </div>
          <span className="text-[11px] text-neutral-400 shrink-0 font-medium">
            {formatDate(listing.dateFound)}
          </span>
        </div>
      </div>
    </article>
  );
};
