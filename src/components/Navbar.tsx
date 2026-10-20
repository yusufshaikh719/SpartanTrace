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
  MapPin,
  CheckCircle2,
  X,
  Sparkles,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import { SJSU_LOCATIONS } from '../utils/constants';

interface NavbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  onOpenPostModal: () => void;
  onOpenAlertsModal: () => void;
  onOpenAdminModal: () => void;
  onOpenAuthModal: () => void;
  onOpenSupabaseModal: () => void;
  onOpenNotifications: () => void;
  isSupabaseLive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchTerm,
  onSearchChange,
  selectedLocation,
  onLocationChange,
  onOpenPostModal,
  onOpenAlertsModal,
  onOpenAdminModal,
  onOpenAuthModal,
  onOpenSupabaseModal,
  onOpenNotifications,
  isSupabaseLive,
}) => {
  const { user, isAuthenticated, isAdmin, logout, switchUser, availableUsers } = useAuth();
  const { unreadCount } = useNotifications();
  const { conversations, openChatWithConversation } = useChat();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Logo & Brand Identity */}
          <div
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
            onClick={() => onSearchChange('')}
          >
            <div className="w-9 h-9 rounded-xl bg-sjsu-navy text-sjsu-gold flex items-center justify-center font-black text-sm tracking-tighter shadow-sm border border-sjsu-gold/30">
              ST
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  Spartan<span className="text-sjsu-500">Trace</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 px-1.5 py-0.5 rounded">
                  SJSU
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                Campus Item Recovery
              </span>
            </div>
          </div>

          {/* Unified Sleek Search & Campus Location Input */}
          <div className="flex-1 max-w-2xl flex items-center bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 focus-within:border-sjsu-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sjsu-500/10 transition-all px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search lost items (e.g. AirPods, keys, backpack)..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-transparent border-none text-xs sm:text-sm px-2.5 focus:outline-none text-slate-800 placeholder-slate-400"
            />

            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Compact Location Pill */}
            <div className="relative shrink-0 border-l border-slate-200 pl-2">
              <button
                type="button"
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-sjsu-500 py-1 px-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-sjsu-500 shrink-0" />
                <span className="hidden md:inline max-w-[120px] truncate">
                  {selectedLocation === 'All' ? 'All SJSU' : selectedLocation.split('-')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLocationDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 max-h-72 overflow-y-auto">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Campus Buildings
                  </div>
                  <button
                    onClick={() => {
                      onLocationChange('All');
                      setShowLocationDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 ${
                      selectedLocation === 'All' ? 'text-sjsu-500 font-bold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>All SJSU Campus</span>
                    {selectedLocation === 'All' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {SJSU_LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        onLocationChange(loc);
                        setShowLocationDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs truncate flex items-center justify-between hover:bg-slate-50 ${
                        selectedLocation === loc ? 'text-sjsu-500 font-bold bg-blue-50/50' : 'text-slate-600'
                      }`}
                    >
                      <span className="truncate">{loc}</span>
                      {selectedLocation === loc && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Icons & User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Report Found Item Button (Clean SJSU Spartan styling) */}
            <button
              onClick={onOpenPostModal}
              className="flex items-center gap-1.5 bg-sjsu-500 hover:bg-sjsu-600 active:bg-sjsu-700 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Post Found Item</span>
              <span className="sm:hidden">Post</span>
            </button>

            {/* Direct Messages Icon */}
            <button
              onClick={() => {
                if (conversations.length > 0) {
                  openChatWithConversation(conversations[0].id);
                } else {
                  alert('No active chats. Start a chat by claiming a found item or reviewing a claim on your item.');
                }
              }}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Direct Messages"
            >
              <MessageSquare className="w-5 h-5" />
              {conversations.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sjsu-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile / Menu */}
            <div className="relative ml-1">
              {isAuthenticated && user ? (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 pl-2 pr-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-700 hidden lg:inline max-w-[90px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    {user.name.charAt(0)}
                  </div>
                </button>
              ) : (
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 text-xs font-bold text-sjsu-500 hover:text-sjsu-600 bg-sjsu-50 hover:bg-sjsu-100 px-3 py-2 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Log in</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {showUserMenu && user && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      {user.isAdmin && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" /> Verified SJSU Account
                    </div>
                  </div>

                  {/* Actions inside menu */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAlertsModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" /> Lost Item Alerts (FR16)
                    </button>

                    {user.isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAdminModal();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4 text-sjsu-500" /> Admin Moderation Queue
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSupabaseModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-slate-500" />
                        <span>Supabase Config</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isSupabaseLive ? 'Live' : 'Local Demo'}
                      </span>
                    </button>
                  </div>

                  {/* Quick Role Switcher for graders/testing */}
                  <div className="border-t border-slate-100 pt-2 px-4 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Switch Role (Grading Demo)
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {availableUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUser(u.id);
                            setShowUserMenu(false);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                            user.id === u.id
                              ? 'bg-sjsu-50 text-sjsu-500 font-bold border border-sjsu-200'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                          }`}
                        >
                          <p className="truncate font-medium">{u.name.split(' ')[0]}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{u.role}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
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
