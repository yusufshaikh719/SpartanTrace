import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  AlertTriangle,
  UserX,
  FileText,
  CheckCircle,
  XCircle,
  Trash2,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { ReportItem, AdminAuditLog, UserProfile, Listing } from '../types';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { formatRelativeTime } from '../utils/formatters';

interface AdminPanelModalProps {
  onClose: () => void;
  onRefreshListings: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  onClose,
  onRefreshListings,
}) => {
  const { user, refreshUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'listings' | 'audit'>('reports');

  // Reports
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [adminResolutionNote, setAdminResolutionNote] = useState('');

  // Users
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userReason, setUserReason] = useState('');

  // Listings for Moderation
  const [listings, setListings] = useState<Listing[]>([]);
  const [removalReason, setRemovalReason] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const r = await dbService.getReports();
    setReports(r);
    const u = await dbService.getUsers();
    setUsers(u);
    const l = await dbService.getListings({ includeReturned: true });
    setListings(l);
    const logs = await dbService.getAuditLogs();
    setAuditLogs(logs);
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 text-center max-w-sm">
          <p className="text-red-600 font-bold mb-2">Access Denied</p>
          <p className="text-xs text-neutral-500 mb-4">You must be logged in as an Administrator.</p>
          <button onClick={onClose} className="px-4 py-2 bg-neutral-200 rounded-lg text-xs font-semibold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleResolveReport = async (status: 'Dismissed' | 'Confirmed') => {
    if (!selectedReport) return;
    try {
      await dbService.resolveReport(
        selectedReport.id,
        status,
        user.id,
        user.name,
        adminResolutionNote
      );

      if (status === 'Confirmed' && selectedReport.contentType === 'listing') {
        const shouldRemove = window.confirm(
          'Remove this listing from public search now?'
        );
        if (shouldRemove) {
          await dbService.removeListing(
            selectedReport.contentId,
            user.id,
            user.name,
            adminResolutionNote || selectedReport.reason
          );
          onRefreshListings();
        }
      }

      setAdminResolutionNote('');
      setSelectedReport(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve report');
    }
  };

  const handleRemoveListing = async (listingId: string) => {
    const reason = removalReason.trim() || 'Violates community guidelines';
    try {
      await dbService.removeListing(listingId, user.id, user.name, reason);
      setRemovalReason('');
      await loadAllData();
      onRefreshListings();
    } catch (err: any) {
      alert(err.message || 'Failed to remove listing');
    }
  };

  const handleToggleSuspend = async (targetUser: UserProfile) => {
    const isSuspending = !targetUser.isSuspended;
    const reason =
      userReason.trim() || (isSuspending ? 'Account suspended by administrator' : 'Account restored by administrator');

    try {
      await dbService.setAccountSuspension(
        targetUser.id,
        isSuspending,
        user.id,
        user.name,
        reason
      );
      setUserReason('');
      refreshUsers();
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-neutral-800" />
            <h2 className="text-base font-bold text-neutral-900">Administration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-6 border-b border-neutral-200 gap-4 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('reports');
              setSelectedReport(null);
            }}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>Reports ({reports.filter((r) => r.status === 'Pending').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'listings'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>Listings</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>Accounts</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>Audit Log</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 flex-1 text-xs">
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {selectedReport ? (
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-700">
                      Report on {selectedReport.contentType}
                    </span>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="text-neutral-500 hover:underline"
                    >
                      ← Back
                    </button>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-neutral-200">
                    <p className="text-neutral-400 font-semibold mb-1">Reported Content:</p>
                    <p className="text-neutral-800 italic">"{selectedReport.contentSnippet}"</p>
                  </div>

                  <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                    <p className="text-red-800 font-semibold mb-1">Reason:</p>
                    <p className="text-red-900">{selectedReport.reason}</p>
                  </div>

                  {selectedReport.status === 'Pending' ? (
                    <div className="space-y-3 pt-2">
                      <input
                        type="text"
                        placeholder="Resolution note (optional)..."
                        value={adminResolutionNote}
                        onChange={(e) => setAdminResolutionNote(e.target.value)}
                        className="w-full border border-neutral-200 rounded-lg p-2 bg-white focus:outline-neutral-900"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveReport('Dismissed')}
                          className="flex-1 py-2 px-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold rounded-xl transition-colors"
                        >
                          Dismiss Report
                        </button>
                        <button
                          onClick={() => handleResolveReport('Confirmed')}
                          className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                        >
                          Confirm Violation
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-neutral-100 rounded-lg text-neutral-600">
                      Resolved as {selectedReport.status} by {selectedReport.resolvedBy}.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.length === 0 ? (
                    <div className="text-center py-8 text-neutral-400">
                      No reports in the queue.
                    </div>
                  ) : (
                    reports.map((rep) => (
                      <div
                        key={rep.id}
                        onClick={() => setSelectedReport(rep)}
                        className="p-3 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                rep.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : rep.status === 'Confirmed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {rep.status}
                            </span>
                            <span className="font-semibold text-neutral-800">
                              "{rep.contentSnippet.slice(0, 45)}..."
                            </span>
                          </div>
                          <p className="text-neutral-500">
                            By {rep.reporterName} • {rep.reason}
                          </p>
                        </div>
                        <span className="text-neutral-400 hover:text-neutral-900">
                          Review →
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="space-y-2">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="p-3 bg-white border border-neutral-200 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img src={l.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 truncate">{l.title}</span>
                        {l.isRemoved && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                            Removed
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-400 truncate">
                        {l.finderName} • {l.locationFound}
                      </p>
                    </div>
                  </div>

                  {!l.isRemoved ? (
                    <button
                      onClick={() => {
                        const r = prompt('Reason for removal (sent to owner):');
                        if (r) {
                          setRemovalReason(r);
                          handleRemoveListing(l.id);
                        }
                      }}
                      className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-semibold shrink-0"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="text-neutral-400 italic shrink-0">
                      Removed
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3 bg-white border border-neutral-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900">{u.name}</span>
                      {u.isSuspended && (
                        <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-semibold">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-400">{u.email}</p>
                  </div>

                  {u.id !== user.id && (
                    <button
                      onClick={() => handleToggleSuspend(u)}
                      className={`px-3 py-1.5 rounded-lg font-semibold ${
                        u.isSuspended
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {u.isSuspended ? 'Restore' : 'Suspend'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-2 font-mono">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Admin: {log.adminName}</span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="font-semibold text-neutral-800">
                    {log.action} on {log.targetType} ({log.targetId})
                  </div>
                  <p className="text-neutral-600 font-sans text-[11px]">Reason: {log.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
