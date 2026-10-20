import React from 'react';
import {
  Laptop,
  KeyRound,
  CreditCard,
  Shirt,
  Sparkles,
  BookOpen,
  Briefcase,
  Grid,
  Layers,
  ArrowUpDown,
  Calendar,
  X,
  History,
  MapPin,
  Search,
} from 'lucide-react';
import { ITEM_CATEGORIES } from '../utils/constants';

interface ExploreToolbarProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  sortBy: 'relevance' | 'newest';
  onSortChange: (sort: 'relevance' | 'newest') => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  searchTerm: string;
  onClearSearch: () => void;
  viewMode: 'all' | 'my-listings';
  onViewModeChange: (mode: 'all' | 'my-listings') => void;
  isAuthenticated: boolean;
  totalResults: number;
  onClearAllFilters: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  All: <Grid className="w-3.5 h-3.5" />,
  Electronics: <Laptop className="w-3.5 h-3.5" />,
  Keys: <KeyRound className="w-3.5 h-3.5" />,
  'IDs & Cards': <CreditCard className="w-3.5 h-3.5" />,
  'Clothing & Apparel': <Shirt className="w-3.5 h-3.5" />,
  Accessories: <Sparkles className="w-3.5 h-3.5" />,
  'Books & Supplies': <BookOpen className="w-3.5 h-3.5" />,
  'Bags & Backpacks': <Briefcase className="w-3.5 h-3.5" />,
  Other: <Layers className="w-3.5 h-3.5" />,
};

export const ExploreToolbar: React.FC<ExploreToolbarProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedLocation,
  onLocationChange,
  sortBy,
  onSortChange,
  dateRange,
  onDateRangeChange,
  searchTerm,
  onClearSearch,
  viewMode,
  onViewModeChange,
  isAuthenticated,
  totalResults,
  onClearAllFilters,
}) => {
  const categories = ['All', ...ITEM_CATEGORIES];

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedLocation !== 'All' ||
    dateRange !== 'all' ||
    Boolean(searchTerm);

  return (
    <div className="bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
        {/* Main Row: Categories (Left) & Controls (Right) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <span className={isSelected ? 'text-sjsu-gold' : 'text-slate-400'}>
                    {CATEGORY_ICONS[cat] || <Layers className="w-3.5 h-3.5" />}
                  </span>
                  <span>{cat === 'All' ? 'All Items' : cat}</span>
                </button>
              );
            })}
          </div>

          {/* Right Toolbar: View mode, Sort, Date */}
          <div className="flex items-center justify-between md:justify-end gap-2 text-xs shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-100">
            {/* View Mode Switcher (All vs My History) */}
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              <button
                onClick={() => onViewModeChange('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Campus Feed
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => onViewModeChange('my-listings')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'my-listings'
                      ? 'bg-white text-sjsu-500 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-3 h-3" />
                  <span>My Listings</span>
                </button>
              )}
            </div>

            {/* Sort Dropdown (FR12) */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600">
              <ArrowUpDown className="w-3 h-3 text-slate-400 mr-1" />
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as 'relevance' | 'newest')}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer text-slate-700"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            {/* Date Filter (FR13) */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600">
              <Calendar className="w-3 h-3 text-slate-400 mr-1" />
              <select
                value={dateRange}
                onChange={(e) => onDateRangeChange(e.target.value)}
                className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer text-slate-700"
              >
                <option value="all">Any date</option>
                <option value="today">Today</option>
                <option value="3days">Past 3 Days</option>
                <option value="7days">Past Week</option>
                <option value="30days">Past Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips / Status Row (Only visible when filtering) */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between gap-2 pt-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-slate-400">Filtering:</span>

              {searchTerm && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-sjsu-500 border border-blue-200/60 px-2 py-0.5 rounded-md font-medium text-[11px]">
                  <Search className="w-3 h-3" /> "{searchTerm}"
                  <button onClick={onClearSearch} className="hover:text-red-500 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                  {selectedCategory}
                  <button onClick={() => onSelectCategory('All')} className="hover:text-red-500 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedLocation !== 'All' && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                  <MapPin className="w-3 h-3 text-sjsu-500" />
                  <span className="max-w-[140px] truncate">{selectedLocation}</span>
                  <button onClick={() => onLocationChange('All')} className="hover:text-red-500 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {dateRange !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                  Date: {dateRange}
                  <button onClick={() => onDateRangeChange('all')} className="hover:text-red-500 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={onClearAllFilters}
                className="text-sjsu-500 hover:text-sjsu-600 font-semibold underline text-[11px] ml-1"
              >
                Clear all
              </button>
            </div>

            <span className="font-medium text-slate-400 shrink-0 text-[11px]">
              {totalResults} {totalResults === 1 ? 'match' : 'matches'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
