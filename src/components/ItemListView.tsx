import React from 'react';
import { MapPin, Clock, Tag, ExternalLink } from 'lucide-react';
import { Listing } from '../types';
import { formatDate, formatRelativeTime, getCampusPlaceholderImage } from '../utils/formatters';

interface ItemListViewProps {
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
  currentUserId?: string;
}

export const ItemListView: React.FC<ItemListViewProps> = ({
  listings,
  onSelectListing,
  currentUserId,
}) => {
  const getStatusBadge = (status: Listing['status']) => {
    switch (status) {
      case 'Available':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Available',
        };
      case 'Pending':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: 'In Review',
        };
      case 'Claimed':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
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
          label: status,
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50/80 border-b border-neutral-200/80 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Item Details</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Location Found</th>
              <th className="py-3.5 px-4">Date Found</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {listings.map((item) => {
              const status = getStatusBadge(item.status);
              const isOwner = currentUserId && item.finderId === currentUserId;

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectListing(item)}
                  className="hover:bg-neutral-50/90 cursor-pointer transition-colors group"
                >
                  {/* Item Details */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                        <img
                          src={item.photoUrl || getCampusPlaceholderImage(item.category, item.title)}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getCampusPlaceholderImage(item.category, item.title);
                          }}
                        />
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-neutral-900 group-hover:text-sjsu-600 transition-colors truncate">
                            {item.title}
                          </p>
                          {isOwner && (
                            <span className="bg-sjsu-navy text-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0">
                              Yours
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                      <Tag className="w-3 h-3 text-neutral-400" />
                      <span>{item.category}</span>
                    </span>
                  </td>

                  {/* Location */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-neutral-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate max-w-[180px]">{item.locationFound}</span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                    <div>{formatDate(item.dateFound)}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      {formatRelativeTime(item.createdAt)}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      <span>{status.label}</span>
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-neutral-100 group-hover:bg-sjsu-600 group-hover:text-white text-neutral-700 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
