import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Sparkles,
  Database,
  History,
} from 'lucide-react';
import { Listing } from './types';
import { dbService } from './services/db';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ExploreToolbar } from './components/ExploreToolbar';
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

  // Search & Filter state (FR11, FR12, FR13)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest'>('relevance');
  const [viewMode, setViewMode] = useState<'all' | 'my-listings'>('all');

  // Listings data
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseLive, setIsSupabaseLive] = useState(false);

  // Active Modals
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

  // Calculate Date bounds for filtering (FR13)
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

    const isLive = await dbService.isSupabaseConnected();
    setIsSupabaseLive(isLive);

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

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedLocation('All');
    setDateRange('all');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col text-slate-800">
      {/* Sleek, Uncluttered Navigation Bar */}
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
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
        isSupabaseLive={isSupabaseLive}
      />

      {/* Unified Category & Exploration Toolbar */}
      <ExploreToolbar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        sortBy={sortBy}
        onSortChange={setSortBy}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchTerm={searchTerm}
        onClearSearch={() => setSearchTerm('')}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isAuthenticated={isAuthenticated}
        totalResults={listings.length}
        onClearAllFilters={clearAllFilters}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Banner if in 'My Listings' view */}
        {viewMode === 'my-listings' && (
          <div className="mb-5 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs text-sjsu-700">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-sjsu-500 shrink-0" />
              <span>
                <strong>Your Listings History:</strong> Displays all items you reported found, including returned ones (FR08).
              </span>
            </div>
            <button
              onClick={() => setViewMode('all')}
              className="font-semibold underline hover:text-sjsu-900"
            >
              Back to Campus Feed
            </button>
          </div>
        )}

        {/* Listings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200/80 p-3 h-64 animate-pulse flex flex-col justify-between"
              >
                <div className="bg-slate-100 aspect-4/3 rounded-xl mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No items match your criteria</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Try broadening your filters, or set an alert to be notified when someone reports it.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={clearAllFilters}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Reset Filters
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) setIsAuthModalOpen(true);
                  else setIsAlertsModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-sjsu-500 hover:bg-sjsu-600 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-sjsu-gold" />
                <span>Create Lost Alert</span>
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

      {/* Minimalist Campus Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-sjsu-navy text-sjsu-gold font-bold flex items-center justify-center text-[10px]">
              ST
            </div>
            <span className="font-semibold text-slate-700">SpartanTrace</span>
            <span>• San Jose State University Item Recovery</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="hover:text-sjsu-500 flex items-center gap-1 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseLive ? 'bg-emerald-500' : 'bg-blue-400'
                }`}
              />
              <span>{isSupabaseLive ? 'Supabase Free Tier (Live)' : 'Supabase Demo (Local)'}</span>
            </button>
            <span>•</span>
            <span className="text-slate-400">Yusuf, Jacob, Ziyad, Jagvir</span>
          </div>
        </div>
      </footer>

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
            alert('Your found item has been published (FR03).');
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
            alert('Listing updated successfully (FR10).');
          }}
        />
      )}

      {claimingListing && (
        <ClaimModal
          listing={claimingListing}
          onClose={() => setClaimingListing(null)}
          onSuccess={() => {
            fetchListings();
            alert('Claim submitted! Direct chat opened with finder.');
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
