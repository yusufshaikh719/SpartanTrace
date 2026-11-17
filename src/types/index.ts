export type ItemCategory =
  | 'Electronics'
  | 'Keys'
  | 'IDs & Cards'
  | 'Clothing & Apparel'
  | 'Accessories'
  | 'Books & Supplies'
  | 'Bags & Backpacks'
  | 'Other';

export type ListingStatus = 'Available' | 'Pending' | 'Claimed' | 'Returned';

export type UserRole = 'finder' | 'looker' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
  isAdmin?: boolean;
  isSuspended?: boolean;
  failedLoginAttempts?: number;
  lockoutUntil?: string | null;
  lastActive?: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  finderId: string;
  finderName: string;
  finderEmail?: string;
  title: string;
  description: string;
  photoUrl: string;
  category: ItemCategory;
  locationFound: string;
  dateFound: string; // YYYY-MM-DD
  status: ListingStatus;
  returnDate?: string | null;
  isRemoved?: boolean;
  moderationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  listingId: string;
  claimantId: string;
  claimantName: string;
  claimantEmail: string;
  proofDescription: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  isRemoved?: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  claimId: string;
  listingId: string;
  listingTitle: string;
  listingPhoto: string;
  isReadOnly?: boolean;
  finderId: string;
  claimantId: string;
  claimantName: string;
  finderName: string;
  lastMessage?: string;
  updatedAt: string;
}

export interface LostItemAlert {
  id: string;
  userId: string;
  keywords: string;
  category?: string;
  location?: string;
  dateLost?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'claim_received'
  | 'claim_accepted'
  | 'claim_rejected'
  | 'new_message'
  | 'alert_match'
  | 'content_removed'
  | 'item_returned';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkType: 'listing' | 'conversation' | 'claim';
  linkId: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  contentType: 'listing' | 'message' | 'user';
  contentId: string;
  ownerId: string;
  ownerName: string;
  reason: string;
  contentSnippet: string;
  status: 'Pending' | 'Dismissed' | 'Confirmed';
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  adminNotes?: string | null;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: 'REMOVE_LISTING' | 'REMOVE_MESSAGE' | 'SUSPEND_USER' | 'RESTORE_USER' | 'RESOLVE_REPORT';
  targetId: string;
  targetType: 'listing' | 'message' | 'user' | 'report';
  reason: string;
  createdAt: string;
}
