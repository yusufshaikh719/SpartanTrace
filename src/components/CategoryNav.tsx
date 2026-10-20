import React from 'react';
import { X, MapPin, Calendar, Tag } from 'lucide-react';
import { ITEM_CATEGORIES } from '../utils/constants';

interface CategoryNavProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  searchTerm: string;
  onClearSearch: () => void;
  totalResults: number;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedLocation,
  onLocationChange,
  dateRange,
  onDateRangeChange,
  searchTerm,
  onClearSearch,
  totalResults,
}) => {
  const categories = ['All', ...ITEM_CATEGORIES];

  const hasExtraFilters =
    selectedLocation !== 'All' || dateRange !== 'all' || Boolean(searchTerm);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      {/* Category Horizontal Nav */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 ${
                isSelected
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 font-medium'
              }`}
            >
              {cat === 'All' ? 'All Items' : cat}
            </button>
          );
        })}
      </div>

      {/* Discreet Active Filter Badges */}
      {hasExtraFilters && (
        <div className="flex items-center gap-2 pt-3 text-xs text-neutral-500 flex-wrap">
          <span className="text-[11px] font-semibold text-neutral-400">Filters:</span>

          {searchTerm && (
            <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full text-xs">
              "{searchTerm}"
              <button onClick={onClearSearch} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedLocation !== 'All' && (
            <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full text-xs">
              <MapPin className="w-3 h-3 text-neutral-400" />
              <span className="max-w-[150px] truncate">{selectedLocation}</span>
              <button onClick={() => onLocationChange('All')} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {dateRange !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full text-xs">
              <Calendar className="w-3 h-3 text-neutral-400" />
              <span>{dateRange}</span>
              <button onClick={() => onDateRangeChange('all')} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <span className="text-neutral-400 text-[11px] ml-auto">
            {totalResults} {totalResults === 1 ? 'result' : 'results'}
          </span>
        </div>
      )}
    </div>
  );
};
