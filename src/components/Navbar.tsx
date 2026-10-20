import React, { useState } from 'react';
import {
  Search,
  Plus,
  MessageSquare,
  Bell,
  Shield,
  User,
  LogOut,
  SlidersHorizontal,
  Database,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';

interface NavbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onOpenFilterDrawer: () => void;
  activeFilterCount: number;
  onOpenPostModal: () => void;
  onOpenAlertsModal: () => void;
  onOpenAdminModal: () => void;
  onOpenAuthModal: () => void;
  onOpenSupabaseModal: () => void;
  onOpenNotifications: () => void;
  viewMode: 'all' | 'my-listings';
  onViewModeChange: (mode: 'all' | 'my-listings') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchTerm,
  onSearchChange,
  onOpenFilterDrawer,
  activeFilterCount,
  onOpenPostModal,
  onOpenAlertsModal,
  onOpenAdminModal,
  onOpenAuthModal,
  onOpenSupabaseModal,
  onOpenNotifications,
  viewMode,
  onViewModeChange,
}) => {
  const { user, isAuthenticated, isAdmin, logout, switchUser, availableUsers } = useAuth();
  const { unreadCount } = useNotifications();
  const { conversations, openChatWithConversation } = useChat();

  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Minimal Brand Identity */}
          <div
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
            onClick={() => {
              onSearchChange('');
              onViewModeChange('all');
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-amber-400 flex items-center justify-center font-black text-sm tracking-tight shadow-2xs">
              S
            </div>
            <span className="font-bold text-lg text-neutral-900 tracking-tight">
              SpartanTrace
            </span>
          </div>

          {/* Minimal Center Search Bar with Inline Filter Trigger */}
          <div className="flex-1 max-w-xl flex items-center bg-neutral-100/80 hover:bg-neutral-100 rounded-xl px-3 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-900/10 focus-within:border-neutral-300 border border-transparent transition-all">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-transparent border-none text-xs sm:text-sm px-2.5 focus:outline-none text-neutral-900 placeholder-neutral-400"
            />

            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="text-neutral-400 hover:text-neutral-600 p-1 mr-1"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Filter Trigger Button */}
            <button
              type="button"
              onClick={onOpenFilterDrawer}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                activeFilterCount > 0
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-200/80 border border-neutral-200/60 shadow-2xs'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-neutral-950 font-bold text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Post Item */}
            <button
              onClick={onOpenPostModal}
              className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Post Item</span>
            </button>

            {/* Messages */}
            <button
              onClick={() => {
                if (conversations.length > 0) {
                  openChatWithConversation(conversations[0].id);
                } else {
                  alert('No active messages yet. Claims will open a message thread.');
                }
              }}
              className="relative p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
              title="Messages"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              {conversations.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Notifications */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Profile Avatar / Menu */}
            <div className="relative">
              {isAuthenticated && user ? (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-xl bg-neutral-200 text-neutral-800 hover:ring-2 hover:ring-neutral-900/10 font-bold text-xs flex items-center justify-center transition-all"
                >
                  {user.name.charAt(0)}
                </button>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded-xl transition-colors"
                >
                  Sign in
                </button>
              )}

              {/* User Dropdown */}
              {showUserMenu && user && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200/80 py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-4 py-2.5 border-b border-neutral-100">
                    <p className="text-xs font-bold text-neutral-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onViewModeChange(viewMode === 'my-listings' ? 'all' : 'my-listings');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center justify-between"
                    >
                      <span>{viewMode === 'my-listings' ? 'View Campus Feed' : 'My Listings'}</span>
                      {viewMode === 'my-listings' && (
                        <span className="text-[10px] text-blue-600 font-bold">Active</span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAlertsModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Item Alerts</span>
                    </button>

                    {user.isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAdminModal();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5 text-neutral-700" />
                        <span>Administration</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSupabaseModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Database className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Database Connection</span>
                    </button>
                  </div>

                  {/* Account Switcher */}
                  <div className="border-t border-neutral-100 pt-1.5 px-3 pb-1">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-1">
                      Accounts
                    </p>
                    <div className="space-y-0.5">
                      {availableUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUser(u.id);
                            setShowUserMenu(false);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                            user.id === u.id
                              ? 'bg-neutral-100 text-neutral-900 font-bold'
                              : 'text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          <span className="truncate">{u.name}</span>
                          <span className="text-[10px] text-neutral-400 capitalize">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
