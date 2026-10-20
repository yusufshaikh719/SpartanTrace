import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Sparkles,
} from 'lucide-react';
import { Listing } from './types';
import { dbService } from './services/db';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { CategoryNav } from './components/CategoryNav';
import { FilterDrawer } from './components/FilterDrawer';
import { ItemCard } from './components/ItemCard';
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
  const [viewMode, setViewMode] = useState<'all' | 'my-listings'>('all');

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

    setListings(items);
    setIsLoading(false);
  }, [searchTerm, selectedCategory, selectedLocation, dateRange, sortBy, viewMode, user]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedLocation !== 'All' ? 1 : 0) +
    (dateRange !== 'all' ? 1 : 0) +
    (sortBy !== 'relevance' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedCategory('All');
    setSelectedLocation('All');
    setDateRange('all');
    setSortBy('relevance');
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-neutral-50/40 flex flex-col text-neutral-800">
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

      {/* Category Nav & Active Filter Chips */}
      <CategoryNav
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchTerm={searchTerm}
        onClearSearch={() => setSearchTerm('')}
        totalResults={listings.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full">
        {viewMode === 'my-listings' && (
          <div className="mb-4 flex items-center justify-between text-xs text-neutral-600 bg-white border border-neutral-200/80 px-4 py-3 rounded-2xl">
            <span>Viewing items you reported</span>
            <button
              onClick={() => setViewMode('all')}
              className="text-neutral-900 font-semibold hover:underline"
            >
              Back to feed
            </button>
          </div>
        )}

        {/* Listings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-neutral-200/60 p-3 h-64 animate-pulse flex flex-col justify-between"
              >
                <div className="bg-neutral-100 aspect-4/3 rounded-xl mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-100 rounded w-3/4" />
                  <div className="h-3 bg-neutral-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-12 text-center max-w-sm mx-auto my-12 space-y-3">
            <div className="w-10 h-10 bg-neutral-100 text-neutral-400 rounded-xl flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">No items found</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Try resetting filters or set an alert for when it is found.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={resetAllFilters}
                className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-xl transition-colors"
              >
                Reset filters
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) setIsAuthModalOpen(true);
                  else setIsAlertsModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-xl transition-colors"
              >
                Set alert
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {listings.map((item) => (
              <ItemCard
                key={item.id}
                listing={item}
                onClick={() => setSelectedListing(item)}
                isOwner={user?.id === item.finderId}
              />
            ))}
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-neutral-100 py-6 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="font-semibold text-neutral-700">SpartanTrace</span>
          <span className="text-[11px] text-neutral-400">San Jose State University</span>
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
