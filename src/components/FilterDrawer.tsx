import React from 'react';
import { X, RotateCcw, Check, MapPin, Calendar, ArrowUpDown, Tag } from 'lucide-react';
import { ITEM_CATEGORIES, SJSU_LOCATIONS } from '../utils/constants';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  sortBy: 'relevance' | 'newest';
  onSortChange: (sort: 'relevance' | 'newest') => void;
  totalResults: number;
  onReset: () => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  selectedLocation,
  onLocationChange,
  dateRange,
  onDateRangeChange,
  sortBy,
  onSortChange,
  totalResults,
  onReset,
}) => {
  if (!isOpen) return null;

  const categories = ['All', ...ITEM_CATEGORIES];

  const dateOptions = [
    { label: 'Anytime', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Past 3 Days', value: '3days' },
    { label: 'Past Week', value: '7days' },
    { label: 'Past Month', value: '30days' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="w-full sm:w-[380px] bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-bold text-base text-neutral-900">Filters</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Sort
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSortChange('relevance')}
                className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-colors ${
                  sortBy === 'relevance'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                Relevance
              </button>
              <button
                type="button"
                onClick={() => onSortChange('newest')}
                className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-colors ${
                  sortBy === 'newest'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                Newest
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {cat === 'All' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Campus Location */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Campus Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              className="w-full text-xs border border-neutral-200 rounded-xl p-2.5 bg-white text-neutral-800 focus:outline-neutral-900"
            >
              <option value="All">All Campus Locations</option>
              {SJSU_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Date Reported
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onDateRangeChange(opt.value)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-colors ${
                    dateRange === opt.value
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 px-3 py-2 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors text-center"
          >
            Show {totalResults} {totalResults === 1 ? 'Item' : 'Items'}
          </button>
        </div>
      </div>
    </div>
  );
};
