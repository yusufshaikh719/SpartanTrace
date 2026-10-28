import React, { useState } from 'react';
import {
  Search,
  Plus,
  MessageSquare,
  Bell,
  Shield,
  User,
  LogOut,
  Database,
  X,
  Sparkles,
  ShieldCheck,
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
  onOpenPostModal,
  onOpenAlertsModal,
  onOpenAdminModal,
  onOpenAuthModal,
  onOpenSupabaseModal,
  onOpenNotifications,
  viewMode,
  onViewModeChange,
}) => {
  const { user, isAuthenticated, logout, switchUser, availableUsers } = useAuth();
  const { unreadCount } = useNotifications();
  const { conversations, openChatWithConversation } = useChat();

  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4 sm:gap-6">
          {/* Authentic Spartan Campus Identity */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => {
              onSearchChange('');
              onViewModeChange('all');
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-sjsu-navy text-sjsu-gold flex items-center justify-center font-black text-base tracking-tight shadow-xs border border-sjsu-gold/20">
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg text-neutral-900 tracking-tight leading-tight">
                  Spartan<span className="text-sjsu-500">Trace</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-bold text-sjsu-700 bg-sjsu-50 border border-sjsu-100 px-1.5 py-0.5 rounded">
                  <ShieldCheck className="w-2.5 h-2.5 text-sjsu-500" />
                  SJSU
                </span>
              </div>
              <p className="hidden sm:block text-[10px] font-medium text-neutral-400 -mt-0.5 tracking-wide">
                Campus Lost &amp; Found Registry
              </p>
            </div>
          </div>

          {/* Clean Central Search Bar */}
          <div className="flex-1 max-w-lg relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search items by keyword, brand, or location..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-neutral-100 hover:bg-neutral-100/90 focus:bg-white rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 border border-transparent focus:border-sjsu-500 focus:outline-none focus:ring-2 focus:ring-sjsu-500/15 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 p-1 text-neutral-400 hover:text-neutral-600 rounded-full transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Navigation */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Action Button */}
            <button
              onClick={onOpenPostModal}
              className="flex items-center gap-1.5 bg-sjsu-600 hover:bg-sjsu-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Report Item</span>
            </button>

            {/* Messages */}
            <button
              onClick={() => {
                if (conversations.length > 0) {
                  openChatWithConversation(conversations[0].id);
                } else {
                  alert('No active claims or messages yet.');
                }
              }}
              className="relative p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
              title="Claims & Messages"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              {conversations.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sjsu-500 rounded-full ring-2 ring-white" />
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
                  className="w-8 h-8 rounded-xl bg-sjsu-navy text-amber-300 hover:ring-2 hover:ring-sjsu-500/20 font-bold text-xs flex items-center justify-center transition-all border border-amber-400/20"
                >
                  {user.name.charAt(0)}
                </button>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="text-xs font-semibold text-sjsu-700 hover:text-sjsu-800 bg-sjsu-50 hover:bg-sjsu-100 border border-sjsu-100 px-3 py-2 rounded-xl transition-colors"
                >
                  Sign in
                </button>
              )}

              {/* User Dropdown */}
              {showUserMenu && user && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200/90 py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-4 py-2.5 border-b border-neutral-100">
                    <p className="text-xs font-bold text-neutral-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
                    {user.isAdmin && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-sjsu-700 bg-sjsu-50 px-2 py-0.5 rounded">
                        Campus Administrator
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onViewModeChange(viewMode === 'my-listings' ? 'all' : 'my-listings');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center justify-between"
                    >
                      <span>{viewMode === 'my-listings' ? 'View Campus Registry' : 'My Reported Items'}</span>
                      {viewMode === 'my-listings' && (
                        <span className="text-[10px] text-sjsu-600 font-bold">Active</span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAlertsModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sjsu-gold" />
                      <span>Item Match Alerts</span>
                    </button>

                    {user.isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAdminModal();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5 text-sjsu-700" />
                        <span>Admin Panel</span>
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
                      <span>Database Settings</span>
                    </button>
                  </div>

                  {/* Switch Account (Only if multiple local user accounts exist) */}
                  {availableUsers.length > 1 && (
                    <div className="border-t border-neutral-100 pt-1.5 px-3 pb-1">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-1">
                        Switch Account
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
                  )}

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
