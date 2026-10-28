import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Sparkles,
  Plus,
  ShieldCheck,
  Search,
  RotateCcw,
} from 'lucide-react';
import { Listing } from './types';
import { dbService } from './services/db';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { RegistryHeader } from './components/RegistryHeader';
import { FilterDrawer } from './components/FilterDrawer';
import { ItemCard } from './components/ItemCard';
import { ItemListView } from './components/ItemListView';
import { ItemDetailModal } from './components/ItemDetailModal';
import { PostItemModal } from './components/PostItemModal';
import { EditItemModal } from './components/EditItemModal';
import { ClaimModal } from './components/ClaimModal';
import { ChatDrawer } from './components/ChatDrawer';
import { AlertsModal } from './components/AlertsModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ReportModal } from './components/ReportModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AuthModal } from './components/AuthModal';
import { SupabaseModal } from './components/SupabaseModal';

export const App: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest'>('relevance');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'my-listings'>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');

  // Listings data
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Modals & Drawer
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [claimingListing, setClaimingListing] = useState<Listing | null>(null);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Reporting state
  const [reportData, setReportData] = useState<{
    contentType: 'listing' | 'message';
    contentId: string;
    ownerId: string;
    ownerName: string;
    contentSnippet: string;
  } | null>(null);

  // Calculate Date bounds for filtering
  const getDateRangeBounds = (range: string): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (range === 'today') {
      return { dateFrom: todayStr, dateTo: todayStr };
    } else if (range === '3days') {
      const past = new Date(now.getTime() - 86400000 * 3).toISOString().split('T')[0];
      return { dateFrom: past, dateTo: todayStr };
    } else if (range === '7days') {
      const past = new Date(now.getTime() - 86400000 * 7).toISOString().split('T')[0];
      return { dateFrom: past, dateTo: todayStr };
    } else if (range === '30days') {
      const past = new Date(now.getTime() - 86400000 * 30).toISOString().split('T')[0];
      return { dateFrom: past, dateTo: todayStr };
    }
    return {};
  };

  // Fetch listings
  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    const { dateFrom, dateTo } = getDateRangeBounds(dateRange);

    const items = await dbService.getListings({
      keyword: searchTerm,
      category: selectedCategory,
      location: selectedLocation,
      dateFrom,
      dateTo,
      sort: sortBy,
      includeReturned: viewMode === 'my-listings',
      finderId: viewMode === 'my-listings' ? user?.id : undefined,
    });

    // Apply quick status filter
    let processed = items;
    if (statusFilter === 'available') {
      processed = processed.filter((item) => item.status === 'Available');
    } else if (statusFilter === 'pending') {
      processed = processed.filter((item) => item.status === 'Pending');
    }

    setListings(processed);
    setIsLoading(false);
  }, [searchTerm, selectedCategory, selectedLocation, dateRange, sortBy, statusFilter, viewMode, user]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedLocation !== 'All' ? 1 : 0) +
    (dateRange !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (sortBy !== 'relevance' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedCategory('All');
    setSelectedLocation('All');
    setDateRange('all');
    setStatusFilter('all');
    setSortBy('relevance');
    setSearchTerm('');
  };

  const hasFilterActive = activeFilterCount > 0 || Boolean(searchTerm);

  return (
    <div className="min-h-screen bg-neutral-50/70 flex flex-col text-neutral-800">
      {/* Navbar */}
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
        activeFilterCount={activeFilterCount}
        onOpenPostModal={() => {
          if (!isAuthenticated) {
            setIsAuthModalOpen(true);
          } else {
            setIsPostModalOpen(true);
          }
        }}
        onOpenAlertsModal={() => {
          if (!isAuthenticated) {
            setIsAuthModalOpen(true);
          } else {
            setIsAlertsModalOpen(true);
          }
        }}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-5">
        {/* Unified Campus Registry Toolbar */}
        <RegistryHeader
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          searchTerm={searchTerm}
          onClearSearch={() => setSearchTerm('')}
          totalResults={listings.length}
          onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
          activeFilterCount={activeFilterCount}
          viewLayout={viewLayout}
          onViewLayoutChange={setViewLayout}
          onOpenAlertsModal={() => {
            if (!isAuthenticated) setIsAuthModalOpen(true);
            else setIsAlertsModalOpen(true);
          }}
          onResetFilters={resetAllFilters}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          viewMode={viewMode}
        />

        {/* Listings Display */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-neutral-200/60 p-4 h-72 animate-pulse flex flex-col justify-between"
              >
                <div className="bg-neutral-100 aspect-4/3 rounded-xl mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-100 rounded w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded w-1/2" />
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          /* Minimalist, Clean Empty State */
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-sjsu-50 text-sjsu-600 rounded-2xl flex items-center justify-center mx-auto border border-sjsu-100">
              {hasFilterActive ? (
                <Search className="w-6 h-6 text-sjsu-600" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-sjsu-600" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">
                {hasFilterActive
                  ? 'No matching items found'
                  : 'Campus registry is clear'}
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
                {hasFilterActive
                  ? 'No active items match your current filter settings. Try resetting filters or search terms.'
                  : 'No lost items are currently registered on campus. If you found or turned in an item at a campus facility, report it below.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              {hasFilterActive ? (
                <button
                  onClick={resetAllFilters}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset filters</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!isAuthenticated) setIsAuthModalOpen(true);
                    else setIsPostModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-sjsu-600 hover:bg-sjsu-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Report Found Item</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (!isAuthenticated) setIsAuthModalOpen(true);
                  else setIsAlertsModalOpen(true);
                }}
                className="px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-xl border border-neutral-200 shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-sjsu-gold" />
                <span>Set match alert</span>
              </button>
            </div>
          </div>
        ) : viewLayout === 'grid' ? (
          /* Spacious Campus Card Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {listings.map((item) => (
              <ItemCard
                key={item.id}
                listing={item}
                onClick={() => setSelectedListing(item)}
                isOwner={user?.id === item.finderId}
              />
            ))}
          </div>
        ) : (
          /* Scannable Campus Registry Ledger */
          <ItemListView
            listings={listings}
            onSelectListing={(item) => setSelectedListing(item)}
            currentUserId={user?.id}
          />
        )}
      </main>

      {/* Clean University Footer */}
      <footer className="bg-white border-t border-neutral-200/80 py-5 text-xs text-neutral-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900">SpartanTrace</span>
            <span className="text-neutral-300">|</span>
            <span className="text-neutral-500">San José State University Lost &amp; Found Network</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            For emergencies or suspected theft, contact SJSU University Police Department (UPD)
          </div>
        </div>
      </footer>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalResults={listings.length}
        onReset={resetAllFilters}
      />

      {/* Modals & Slide-overs */}
      {selectedListing && (
        <ItemDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onOpenClaimModal={(item) => {
            if (!isAuthenticated) {
              setIsAuthModalOpen(true);
            } else {
              setClaimingListing(item);
            }
          }}
          onOpenEditModal={(item) => setEditingListing(item)}
          onOpenReportModal={(type, id, ownerId, ownerName, snippet) => {
            setReportData({
              contentType: type,
              contentId: id,
              ownerId,
              ownerName,
              contentSnippet: snippet,
            });
          }}
          onListingUpdated={() => {
            fetchListings();
            if (selectedListing) {
              dbService.getListingById(selectedListing.id).then((l) => setSelectedListing(l));
            }
          }}
        />
      )}

      {isPostModalOpen && (
        <PostItemModal
          onClose={() => setIsPostModalOpen(false)}
          onSuccess={() => {
            fetchListings();
          }}
        />
      )}

      {editingListing && (
        <EditItemModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSuccess={(updated) => {
            fetchListings();
            setSelectedListing(updated);
          }}
        />
      )}

      {claimingListing && (
        <ClaimModal
          listing={claimingListing}
          onClose={() => setClaimingListing(null)}
          onSuccess={() => {
            fetchListings();
          }}
        />
      )}

      <ChatDrawer
        onOpenReportModal={(type, id, ownerId, ownerName, snippet) => {
          setReportData({
            contentType: type,
            contentId: id,
            ownerId,
            ownerName,
            contentSnippet: snippet,
          });
        }}
      />

      {isAlertsModalOpen && <AlertsModal onClose={() => setIsAlertsModalOpen(false)} />}

      {isNotificationsOpen && (
        <NotificationsModal
          onClose={() => setIsNotificationsOpen(false)}
          onOpenListing={async (id) => {
            const item = await dbService.getListingById(id);
            if (item) setSelectedListing(item);
          }}
        />
      )}

      {reportData && (
        <ReportModal
          reportData={reportData}
          onClose={() => setReportData(null)}
          onSuccess={() => {}}
        />
      )}

      {isAdminModalOpen && (
        <AdminPanelModal
          onClose={() => setIsAdminModalOpen(false)}
          onRefreshListings={fetchListings}
        />
      )}

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}

      {isSupabaseModalOpen && (
        <SupabaseModal
          onClose={() => setIsSupabaseModalOpen(false)}
          onConfigUpdated={fetchListings}
        />
      )}
    </div>
  );
};

export default App;
