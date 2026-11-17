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
import { useChat } from '../context/ChatContext';
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
  const { openChatWithConversation } = useChat();

  const [error, setError] = useState('');
  const [reviewContext, setReviewContext] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'listings' | 'audit'>('reports');

  // Reports
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [adminResolutionNote, setAdminResolutionNote] = useState('');

  // Users
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Listings for Moderation
  const [listings, setListings] = useState<Listing[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  useEffect(() => {
    if (user?.isAdmin) void loadAllData();
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false; setReviewContext({});
    if (selectedReport) {
      dbService.getReportContext(selectedReport.id).then((context) => { if (!cancelled) setReviewContext(context); }).catch((error) => { if (!cancelled) setError(error.message); });
    }
    return () => { cancelled = true; };
  }, [selectedReport?.id]);

  const loadAllData = async () => {
    try {
      const [r, u, l, logs] = await Promise.all([dbService.getReports(), dbService.getUsers(), dbService.getListings({ includeReturned: true }), dbService.getAuditLogs()]);
      setReports(r); setUsers(u); setListings(l); setAuditLogs(logs); setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not load administrator data.'); }
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
    if (!adminResolutionNote.trim()) { setError('An administrative reason is required.'); return; }
    try {
      await dbService.resolveReport(
        selectedReport.id,
        status,
        user.id,
        user.name,
        adminResolutionNote
      );

      if (status === 'Confirmed' && selectedReport.contentType !== 'user' && window.confirm(`Remove this ${selectedReport.contentType} now?`)) {
        const remove = selectedReport.contentType === 'listing' ? dbService.removeListing : dbService.removeMessage;
        await remove(selectedReport.contentId, user.id, user.name, adminResolutionNote);
        onRefreshListings();
      }

      setAdminResolutionNote('');
      setSelectedReport(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve report');
    }
  };

  const handleRemoveReportedContent = async () => {
    if (!selectedReport || selectedReport.contentType === 'user') return;
    const reason = (window.prompt('Reason for removal (sent to owner):', selectedReport.adminNotes || '') || '').trim();
    if (!reason) return;
    try {
      const remove = selectedReport.contentType === 'listing' ? dbService.removeListing : dbService.removeMessage;
      await remove(selectedReport.contentId, user.id, user.name, reason);
      setReviewContext(await dbService.getReportContext(selectedReport.id));
      await loadAllData(); onRefreshListings();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not remove reported content.'); }
  };

  const handleRemoveListing = async (listingId: string, suppliedReason: string) => {
    const reason = suppliedReason.trim();
    if (!reason) { setError('Enter a reason before removing content.'); return; }
    try {
      await dbService.removeListing(listingId, user.id, user.name, reason);
      await loadAllData();
      onRefreshListings();
    } catch (err: any) {
      alert(err.message || 'Failed to remove listing');
    }
  };

  const handleToggleSuspend = async (targetUser: UserProfile) => {
    const isSuspending = !targetUser.isSuspended;
    const reason = (window.prompt(`Reason to ${isSuspending ? 'suspend' : 'restore'} ${targetUser.name}:`) || '').trim();
    if (!reason) { setError('Enter a reason before changing an account status.'); return; }

    try {
      await dbService.setAccountSuspension(
        targetUser.id,
        isSuspending,
        user.id,
        user.name,
        reason
      );
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
            aria-label="Close dialog"
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
          {error && <p role="alert" className="p-3 mb-3 bg-red-50 text-red-700 rounded-lg">{error}</p>}
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

                  <div className="text-neutral-600 space-y-1">
                    <p>Reporter: {selectedReport.reporterName}</p><p>Content owner: {selectedReport.ownerName}</p>
                    <p>Submitted: {new Date(selectedReport.createdAt).toLocaleString()}</p>
                    {reviewContext.title && <p>Listing: {reviewContext.title} · {reviewContext.status}</p>}
                    {reviewContext.locationFound && <p>Found: {reviewContext.locationFound} · {reviewContext.dateFound}</p>}
                    {reviewContext.listing && <p>Related listing: {reviewContext.listing.title} · {reviewContext.listing.status}</p>}
                    {reviewContext.conversation && <><p>Conversation: {reviewContext.conversation.id}</p><button className="text-sjsu-600 underline" onClick={() => { onClose(); void openChatWithConversation(reviewContext.conversation.id); }}>Review full conversation</button></>}
                    {reviewContext.content && <p>Current message: {reviewContext.content}</p>}
                    {reviewContext.email && <p>Account: {reviewContext.name} ({reviewContext.email}) · {reviewContext.isSuspended ? 'Suspended' : 'Active'}</p>}
                  </div>
                  <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                    <p className="text-red-800 font-semibold mb-1">Reason:</p>
                    <p className="text-red-900">{selectedReport.reason}</p>
                  </div>

                  {selectedReport.contentType !== 'user' && (
                    <div className="flex items-center gap-2">
                      <button disabled={!!reviewContext.isRemoved} onClick={() => void handleRemoveReportedContent()} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 disabled:bg-neutral-100 disabled:text-neutral-500">
                        {reviewContext.isRemoved ? 'Content removed' : 'Remove reported content'}
                      </button>
                    </div>
                  )}
                  {selectedReport.status === 'Pending' ? (
                    <div className="space-y-3 pt-2">
                      <input
                        type="text"
                        placeholder="Administrative reason (required)..."
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
                      <p>{selectedReport.adminNotes} · {selectedReport.resolvedAt && new Date(selectedReport.resolvedAt).toLocaleString()}</p>
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
                        onClick={() => { setSelectedReport(rep); setAdminResolutionNote(''); }}
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
                          void handleRemoveListing(l.id, r);
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
