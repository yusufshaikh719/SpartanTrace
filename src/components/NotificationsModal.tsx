import React from 'react';
import { X, Bell, Check, Sparkles, MessageCircle, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import { formatRelativeTime } from '../utils/formatters';
import { AppNotification } from '../types';

interface NotificationsModalProps {
  onClose: () => void;
  onOpenListing: (listingId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  onOpenListing,
}) => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const { openChatWithConversation } = useChat();

  const handleNotificationClick = async (notif: AppNotification) => {
    await markAsRead(notif.id);

    if (notif.linkType === 'listing') {
      onOpenListing(notif.linkId);
      onClose();
    } else if (notif.linkType === 'conversation') {
      openChatWithConversation(notif.linkId);
      onClose();
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'alert_match':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'new_message':
        return <MessageCircle className="w-4 h-4 text-emerald-500" />;
      case 'claim_received':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'claim_accepted':
      case 'item_returned':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/90">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sjsu-600" />
            <h2 className="text-base font-extrabold text-gray-900">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400">
              You're all caught up! No notifications.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  n.isRead
                    ? 'bg-white border-gray-100 hover:bg-gray-50'
                    : 'bg-emerald-50/60 border-emerald-200/90 hover:bg-emerald-50'
                }`}
              >
                <div className="p-2 rounded-xl bg-white shadow-2xs shrink-0 mt-0.5">
                  {getNotificationIcon(n.type)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 truncate">{n.title}</h4>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
