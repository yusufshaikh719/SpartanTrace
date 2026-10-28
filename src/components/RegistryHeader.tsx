import React from 'react';
import {
  MapPin,
  Calendar,
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
  Sparkles,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { CAMPUS_HOTSPOTS } from '../utils/constants';

interface RegistryHeaderProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  searchTerm: string;
  onClearSearch: () => void;
  totalResults: number;
  onOpenFilterDrawer: () => void;
  activeFilterCount: number;
  viewLayout: 'grid' | 'list';
  onViewLayoutChange: (layout: 'grid' | 'list') => void;
  onOpenAlertsModal: () => void;
  onResetFilters: () => void;
  statusFilter: 'all' | 'available' | 'pending';
  onStatusFilterChange: (status: 'all' | 'available' | 'pending') => void;
  viewMode: 'all' | 'my-listings';
}

export const RegistryHeader: React.FC<RegistryHeaderProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedLocation,
  onLocationChange,
  dateRange,
  onDateRangeChange,
  searchTerm,
  onClearSearch,
  totalResults,
  onOpenFilterDrawer,
  activeFilterCount,
  viewLayout,
  onViewLayoutChange,
  onOpenAlertsModal,
  onResetFilters,
  statusFilter,
  onStatusFilterChange,
  viewMode,
}) => {
  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedLocation !== 'All' ||
    dateRange !== 'all' ||
    statusFilter !== 'all' ||
    Boolean(searchTerm);

  return (
    <div className="space-y-3 pb-2 pt-1">
      {/* Primary Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Section Title and Result Counter */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              {viewMode === 'my-listings' ? 'My Reported Items' : 'Campus Registry'}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              {viewMode === 'my-listings'
                ? 'Items you found and posted to the campus community'
                : 'Lost & found items recorded across SJSU facilities'}
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-600 bg-neutral-100 border border-neutral-200/80 px-2.5 py-1 rounded-full">
            {totalResults} {totalResults === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
          {/* Location Hotspot Dropdown */}
          <div className="relative inline-flex items-center">
            <MapPin className="w-3.5 h-3.5 text-sjsu-600 absolute left-3 pointer-events-none" />
            <select
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              className="text-xs font-semibold bg-white text-neutral-800 rounded-xl pl-9 pr-8 py-2 border border-neutral-200/90 hover:border-neutral-300 shadow-2xs transition-colors cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-sjsu-500/20"
            >
              {CAMPUS_HOTSPOTS.map((hotspot) => (
                <option key={hotspot.value} value={hotspot.value}>
                  {hotspot.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Quick Status Pill Toggle */}
          <div className="inline-flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60 text-xs font-semibold">
            <button
              onClick={() => onStatusFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onStatusFilterChange('available')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'available'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => onStatusFilterChange('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'pending'
                  ? 'bg-white text-amber-700 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              In Review
            </button>
          </div>

          {/* Advanced Filter Drawer Trigger */}
          <button
            onClick={onOpenFilterDrawer}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border shadow-2xs ${
              activeFilterCount > 0
                ? 'bg-sjsu-navy text-white border-sjsu-navy'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-sjsu-gold text-sjsu-navy font-bold text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View Mode Switcher (Grid vs Table Ledger) */}
          <div className="inline-flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/60">
            <button
              onClick={() => onViewLayoutChange('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewLayout === 'grid'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewLayoutChange('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewLayout === 'list'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
              title="Table / Ledger View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Lost Item Alert Button */}
          <button
            onClick={onOpenAlertsModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-200 shadow-2xs transition-colors"
            title="Create an automated match alert"
          >
            <Sparkles className="w-3.5 h-3.5 text-sjsu-gold" />
            <span>Match Alert</span>
          </button>
        </div>
      </div>

      {/* Active Filter Chips Strip */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 pt-1 text-xs text-neutral-600 flex-wrap animate-in fade-in-50 duration-150">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Active Filters:
          </span>

          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-900 px-2.5 py-1 rounded-full text-xs font-medium border border-neutral-200/70">
              <span>Search: "{searchTerm}"</span>
              <button
                onClick={onClearSearch}
                className="hover:text-red-500 rounded-full p-0.5 transition-colors"
                title="Clear keyword"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedCategory !== 'All' && (
            <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-900 px-2.5 py-1 rounded-full text-xs font-medium border border-neutral-200/70">
              <Tag className="w-3 h-3 text-sjsu-500" />
              <span>{selectedCategory}</span>
              <button
                onClick={() => onSelectCategory('All')}
                className="hover:text-red-500 rounded-full p-0.5 transition-colors"
                title="Clear category"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedLocation !== 'All' && (
            <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-900 px-2.5 py-1 rounded-full text-xs font-medium border border-neutral-200/70">
              <MapPin className="w-3 h-3 text-sjsu-500" />
              <span className="max-w-[160px] truncate">{selectedLocation}</span>
              <button
                onClick={() => onLocationChange('All')}
                className="hover:text-red-500 rounded-full p-0.5 transition-colors"
                title="Clear location"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {dateRange !== 'all' && (
            <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-900 px-2.5 py-1 rounded-full text-xs font-medium border border-neutral-200/70">
              <Calendar className="w-3 h-3 text-sjsu-500" />
              <span>{dateRange}</span>
              <button
                onClick={() => onDateRangeChange('all')}
                className="hover:text-red-500 rounded-full p-0.5 transition-colors"
                title="Clear date range"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-900 px-2.5 py-1 rounded-full text-xs font-medium border border-neutral-200/70">
              <span className="capitalize">Status: {statusFilter}</span>
              <button
                onClick={() => onStatusFilterChange('all')}
                className="hover:text-red-500 rounded-full p-0.5 transition-colors"
                title="Clear status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={onResetFilters}
            className="text-xs font-semibold text-sjsu-600 hover:text-sjsu-700 hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
