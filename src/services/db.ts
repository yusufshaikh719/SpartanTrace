import { getSupabaseClient } from '../lib/supabase';
import {
  Listing,
  Claim,
  Conversation,
  Message,
  LostItemAlert,
  AppNotification,
  ReportItem,
  AdminAuditLog,
  UserProfile,
  ListingStatus,
  ItemCategory,
} from '../types';

// Campus user profile storage defaults (no mock fake users)
export const DEFAULT_USERS: UserProfile[] = [];

// Clean initial empty state for campus listings
const INITIAL_LISTINGS: Listing[] = [];

// In-Memory / LocalStorage helper
class LocalStore {
  constructor() {
    this.purgeLegacyMockData();
  }

  private purgeLegacyMockData(): void {
    try {
      const mockListingIds = new Set(['listing-1', 'listing-2', 'listing-3', 'listing-4', 'listing-5', 'listing-6']);
      const listings = this.get<Listing[]>('listings', []);
      if (listings.some((l) => mockListingIds.has(l.id))) {
        this.set('listings', listings.filter((l) => !mockListingIds.has(l.id)));
      }

      const mockClaimIds = new Set(['claim-1']);
      const claims = this.get<Claim[]>('claims', []);
      if (claims.some((c) => mockClaimIds.has(c.id))) {
        this.set('claims', claims.filter((c) => !mockClaimIds.has(c.id)));
      }

      const mockConvIds = new Set(['conv-1']);
      const convs = this.get<Conversation[]>('conversations', []);
      if (convs.some((c) => mockConvIds.has(c.id))) {
        this.set('conversations', convs.filter((c) => !mockConvIds.has(c.id)));
      }

      const mockMsgIds = new Set(['msg-1', 'msg-2']);
      const msgs = this.get<Message[]>('messages', []);
      if (msgs.some((m) => mockMsgIds.has(m.id))) {
        this.set('messages', msgs.filter((m) => !mockMsgIds.has(m.id)));
      }

      const mockAlertIds = new Set(['alert-1']);
      const alerts = this.get<LostItemAlert[]>('alerts', []);
      if (alerts.some((a) => mockAlertIds.has(a.id))) {
        this.set('alerts', alerts.filter((a) => !mockAlertIds.has(a.id)));
      }

      const mockNotifIds = new Set(['notif-1', 'notif-2']);
      const notifs = this.get<AppNotification[]>('notifications', []);
      if (notifs.some((n) => mockNotifIds.has(n.id))) {
        this.set('notifications', notifs.filter((n) => !mockNotifIds.has(n.id)));
      }

      const mockAuditIds = new Set(['log-1']);
      const logs = this.get<AdminAuditLog[]>('audit_logs', []);
      if (logs.some((l) => mockAuditIds.has(l.id))) {
        this.set('audit_logs', logs.filter((l) => !mockAuditIds.has(l.id)));
      }

      const mockUserIds = new Set(['user-finder-jane', 'user-looker-sam', 'user-admin-alex']);
      const users = this.get<UserProfile[]>('users', []);
      if (users.some((u) => mockUserIds.has(u.id))) {
        this.set('users', users.filter((u) => !mockUserIds.has(u.id)));
      }

      const currentUser = localStorage.getItem('spartantrace_current_user');
      if (currentUser) {
        try {
          const parsed = JSON.parse(currentUser);
          if (mockUserIds.has(parsed.id)) {
            localStorage.removeItem('spartantrace_current_user');
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Error purging mock data:', e);
    }
  }

  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`st_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`st_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  getUsers(): UserProfile[] {
    return this.get<UserProfile[]>('users', []);
  }

  saveUsers(users: UserProfile[]) {
    this.set('users', users);
  }

  getListings(): Listing[] {
    return this.get<Listing[]>('listings', []);
  }

  saveListings(listings: Listing[]) {
    this.set('listings', listings);
  }

  getClaims(): Claim[] {
    return this.get<Claim[]>('claims', []);
  }

  saveClaims(claims: Claim[]) {
    this.set('claims', claims);
  }

  getConversations(): Conversation[] {
    return this.get<Conversation[]>('conversations', []);
  }

  saveConversations(convs: Conversation[]) {
    this.set('conversations', convs);
  }

  getMessages(): Message[] {
    return this.get<Message[]>('messages', []);
  }

  saveMessages(msgs: Message[]) {
    this.set('messages', msgs);
  }

  getAlerts(): LostItemAlert[] {
    return this.get<LostItemAlert[]>('alerts', []);
  }

  saveAlerts(alerts: LostItemAlert[]) {
    this.set('alerts', alerts);
  }

  getNotifications(): AppNotification[] {
    return this.get<AppNotification[]>('notifications', []);
  }

  saveNotifications(notifs: AppNotification[]) {
    this.set('notifications', notifs);
  }

  getReports(): ReportItem[] {
    return this.get<ReportItem[]>('reports', []);
  }

  saveReports(reports: ReportItem[]) {
    this.set('reports', reports);
  }

  getAuditLogs(): AdminAuditLog[] {
    return this.get<AdminAuditLog[]>('audit_logs', []);
  }

  saveAuditLogs(logs: AdminAuditLog[]) {
    this.set('audit_logs', logs);
  }
}

export const localStore = new LocalStore();

// Database Service abstraction supporting both Supabase and LocalStore fallback
export const dbService = {
  // Check if Supabase is active
  async isSupabaseConnected(): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('listings').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  // LISTINGS
  async getListings(options?: {
    keyword?: string;
    category?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: 'relevance' | 'newest';
    includeReturned?: boolean;
    finderId?: string;
  }): Promise<Listing[]> {
    const client = getSupabaseClient();

    let allListings: Listing[] = [];

    if (client) {
      try {
        let query = client.from('listings').select('*').eq('is_removed', false);
        if (options?.finderId) {
          query = query.eq('finder_id', options.finderId);
        } else if (!options?.includeReturned) {
          query = query.neq('status', 'Returned');
        }

        const { data, error } = await query;
        if (!error && data) {
          allListings = data.map((d: any) => ({
            id: d.id,
            finderId: d.finder_id,
            finderName: d.finder_name,
            finderEmail: d.finder_email,
            title: d.title,
            description: d.description,
            photoUrl: d.photo_url,
            category: d.category as ItemCategory,
            locationFound: d.location_found,
            dateFound: d.date_found,
            status: d.status as ListingStatus,
            returnDate: d.return_date,
            isRemoved: d.is_removed,
            moderationReason: d.moderation_reason,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        } else {
          allListings = localStore.getListings();
        }
      } catch {
        allListings = localStore.getListings();
      }
    } else {
      allListings = localStore.getListings();
    }

    // Filter out removed listings for normal users
    let filtered = allListings.filter((l) => !l.isRemoved);

    // If viewing specific finder history, show everything including Returned (FR08)
    if (options?.finderId) {
      filtered = filtered.filter((l) => l.finderId === options.finderId);
    } else if (!options?.includeReturned) {
      // By default, only active listings (Available or Pending) are in active search (FR03, FR08)
      filtered = filtered.filter((l) => l.status !== 'Returned');
    }

    // Keyword Search (FR11): compares keyword with title & description
    const kw = options?.keyword?.trim().toLowerCase();
    if (kw) {
      const words = kw.split(/\s+/).filter(Boolean);
      filtered = filtered.filter((item) => {
        const text = `${item.title} ${item.description} ${item.category} ${item.locationFound}`.toLowerCase();
        return words.some((w) => text.includes(w));
      });
    }

    // Filter by Category (FR13)
    if (options?.category && options.category !== 'All') {
      filtered = filtered.filter((item) => item.category === options.category);
    }

    // Filter by Location (FR13)
    if (options?.location && options.location !== 'All') {
      filtered = filtered.filter((item) =>
        item.locationFound.toLowerCase().includes(options.location!.toLowerCase())
      );
    }

    // Filter by Date Range (FR13)
    if (options?.dateFrom) {
      filtered = filtered.filter((item) => item.dateFound >= options.dateFrom!);
    }
    if (options?.dateTo) {
      filtered = filtered.filter((item) => item.dateFound <= options.dateTo!);
    }

    // Sorting (FR12): Relevance (default) or Newest
    // Equal relevance displays most recently posted listing first
    if (options?.sort === 'newest') {
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      // Relevance sort: score title matches higher than description matches
      if (kw) {
        filtered.sort((a, b) => {
          const score = (item: Listing) => {
            const t = item.title.toLowerCase();
            const d = item.description.toLowerCase();
            let s = 0;
            if (t.includes(kw)) s += 10;
            if (d.includes(kw)) s += 3;
            return s;
          };
          const diff = score(b) - score(a);
          if (diff !== 0) return diff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } else {
        // When no keyword, default to newest posted
        filtered.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }

    return filtered;
  },

  async getListingById(id: string): Promise<Listing | null> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('listings').select('*').eq('id', id).single();
        if (!error && data) {
          return {
            id: data.id,
            finderId: data.finder_id,
            finderName: data.finder_name,
            finderEmail: data.finder_email,
            title: data.title,
            description: data.description,
            photoUrl: data.photo_url,
            category: data.category as ItemCategory,
            locationFound: data.location_found,
            dateFound: data.date_found,
            status: data.status as ListingStatus,
            returnDate: data.return_date,
            isRemoved: data.is_removed,
            moderationReason: data.moderation_reason,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {}
    }
    const listings = localStore.getListings();
    return listings.find((l) => l.id === id) || null;
  },

  // FR01, FR02, FR03: Create Listing
  async createListing(data: {
    finderId: string;
    finderName: string;
    finderEmail: string;
    title: string;
    description: string;
    photoUrl: string;
    category: ItemCategory;
    locationFound: string;
    dateFound: string;
  }): Promise<Listing> {
    const today = new Date().toISOString().split('T')[0];
    if (data.dateFound > today) {
      throw new Error('Date found cannot be later than current date.');
    }

    const newId = `listing-${Date.now()}`;
    const now = new Date().toISOString();
    const newListing: Listing = {
      id: newId,
      ...data,
      status: 'Available',
      returnDate: null,
      isRemoved: false,
      createdAt: now,
      updatedAt: now,
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('listings').insert([
          {
            id: newId,
            finder_id: data.finderId,
            finder_name: data.finderName,
            finder_email: data.finderEmail,
            title: data.title,
            description: data.description,
            photo_url: data.photoUrl,
            category: data.category,
            location_found: data.locationFound,
            date_found: data.dateFound,
            status: 'Available',
            created_at: now,
            updated_at: now,
          },
        ]);
      } catch (err) {
        console.warn('Supabase listing insert fallback to local:', err);
      }
    }

    // Always maintain local cache
    const current = localStore.getListings();
    localStore.saveListings([newListing, ...current]);

    // Check lost-item alerts and notify matching users (FR17, FR25)
    await this.checkAndTriggerAlertNotifications(newListing);

    return newListing;
  },

  // FR09, FR10: Update Listing
  async updateListing(
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      photoUrl: string;
      category: ItemCategory;
      locationFound: string;
      dateFound: string;
    }>
  ): Promise<Listing> {
    const existing = await this.getListingById(id);
    if (!existing) throw new Error('Listing not found');
    if (existing.status === 'Returned') {
      throw new Error('Returned listings cannot be edited.');
    }

    if (updates.dateFound) {
      const today = new Date().toISOString().split('T')[0];
      if (updates.dateFound > today) {
        throw new Error('Date found cannot be later than current date.');
      }
    }

    const now = new Date().toISOString();
    const updated: Listing = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('listings')
          .update({
            title: updated.title,
            description: updated.description,
            photo_url: updated.photoUrl,
            category: updated.category,
            location_found: updated.locationFound,
            date_found: updated.dateFound,
            updated_at: now,
          })
          .eq('id', id);
      } catch {}
    }

    const listings = localStore.getListings().map((l) => (l.id === id ? updated : l));
    localStore.saveListings(listings);
    return updated;
  },

  // FR06, FR07, FR08: Update Listing Status (Available -> Pending -> Claimed -> Returned)
  async updateListingStatus(
    id: string,
    status: ListingStatus,
    returnDetails?: { confirmedBy: string }
  ): Promise<Listing> {
    const existing = await this.getListingById(id);
    if (!existing) throw new Error('Listing not found');

    const now = new Date().toISOString();
    const updated: Listing = {
      ...existing,
      status,
      returnDate: status === 'Returned' ? now : existing.returnDate,
      updatedAt: now,
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('listings')
          .update({
            status,
            return_date: updated.returnDate,
            updated_at: now,
          })
          .eq('id', id);
      } catch {}
    }

    const listings = localStore.getListings().map((l) => (l.id === id ? updated : l));
    localStore.saveListings(listings);

    // If returned, record return in history (FR08)
    if (status === 'Returned') {
      // Create notification to finder and accepted claimant
      const claims = await this.getClaimsForListing(id);
      const acceptedClaim = claims.find((c) => c.status === 'Accepted');
      if (acceptedClaim) {
        await this.createNotification({
          userId: acceptedClaim.claimantId,
          type: 'item_returned',
          title: 'Item Return Completed 🎉',
          message: `The Finder confirmed return of "${existing.title}". Thank you for using SpartanTrace!`,
          linkType: 'listing',
          linkId: id,
        });
      }
    }

    return updated;
  },

  // CLAIMS (FR04, FR14)
  async getClaimsForListing(listingId: string): Promise<Claim[]> {
    const claims = localStore.getClaims();
    return claims.filter((c) => c.listingId === listingId);
  },

  async getClaimsByUser(userId: string): Promise<Claim[]> {
    const claims = localStore.getClaims();
    return claims.filter((c) => c.claimantId === userId);
  },

  // FR14 & FR15: Submit Claim & Open DM conversation
  async createClaim(data: {
    listingId: string;
    claimantId: string;
    claimantName: string;
    claimantEmail: string;
    proofDescription: string;
  }): Promise<{ claim: Claim; conversation: Conversation }> {
    const listing = await this.getListingById(data.listingId);
    if (!listing) throw new Error('Listing not found');

    // Rule: Looker can submit one active claim for an Available listing
    const existingClaims = localStore.getClaims();
    const duplicate = existingClaims.find(
      (c) => c.listingId === data.listingId && c.claimantId === data.claimantId && c.status !== 'Rejected'
    );
    if (duplicate) {
      throw new Error('You have already submitted an active claim for this item.');
    }

    const claimId = `claim-${Date.now()}`;
    const now = new Date().toISOString();
    const newClaim: Claim = {
      id: claimId,
      listingId: data.listingId,
      claimantId: data.claimantId,
      claimantName: data.claimantName,
      claimantEmail: data.claimantEmail,
      proofDescription: data.proofDescription,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    };

    localStore.saveClaims([newClaim, ...existingClaims]);

    // Create or Open Direct Message conversation (FR15)
    const convId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: convId,
      claimId,
      listingId: listing.id,
      listingTitle: listing.title,
      listingPhoto: listing.photoUrl,
      finderId: listing.finderId,
      claimantId: data.claimantId,
      finderName: listing.finderName,
      claimantName: data.claimantName,
      lastMessage: `Claim submitted: "${data.proofDescription.slice(0, 60)}..."`,
      updatedAt: now,
    };

    const convs = localStore.getConversations();
    localStore.saveConversations([newConv, ...convs]);

    // First automated message in the thread
    const initialMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: convId,
      senderId: data.claimantId,
      senderName: data.claimantName,
      content: `Claim submitted with proof of ownership:\n"${data.proofDescription}"`,
      createdAt: now,
    };
    const msgs = localStore.getMessages();
    localStore.saveMessages([...msgs, initialMsg]);

    // Notify Finder of new claim (FR24)
    await this.createNotification({
      userId: listing.finderId,
      type: 'claim_received',
      title: 'New Ownership Claim',
      message: `${data.claimantName} submitted a claim for "${listing.title}". Click to chat and verify ownership.`,
      linkType: 'conversation',
      linkId: convId,
    });

    return { claim: newClaim, conversation: newConv };
  },

  async updateClaimStatus(claimId: string, status: 'Accepted' | 'Rejected'): Promise<Claim> {
    const claims = localStore.getClaims();
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) throw new Error('Claim not found');

    const updatedClaim: Claim = {
      ...claim,
      status,
      updatedAt: new Date().toISOString(),
    };

    localStore.saveClaims(claims.map((c) => (c.id === claimId ? updatedClaim : c)));

    // Notify Claimant (FR24)
    await this.createNotification({
      userId: claim.claimantId,
      type: status === 'Accepted' ? 'claim_accepted' : 'claim_rejected',
      title: status === 'Accepted' ? 'Claim Accepted! ✅' : 'Claim Status Updated',
      message:
        status === 'Accepted'
          ? `Your claim was accepted by the Finder! Check your messages to coordinate the campus meetup.`
          : `Your claim was not approved by the Finder for this listing.`,
      linkType: 'listing',
      linkId: claim.listingId,
    });

    return updatedClaim;
  },

  // MESSAGING (FR05, FR15)
  async getConversations(userId: string): Promise<Conversation[]> {
    const all = localStore.getConversations();
    return all.filter((c) => c.finderId === userId || c.claimantId === userId);
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const all = localStore.getMessages();
    return all.filter((m) => m.conversationId === conversationId && !m.isRemoved);
  },

  async sendMessage(conversationId: string, senderId: string, senderName: string, content: string): Promise<Message> {
    const convs = localStore.getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (!conv) throw new Error('Conversation not found');

    const now = new Date().toISOString();
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      senderName,
      content,
      isRemoved: false,
      createdAt: now,
    };

    const msgs = localStore.getMessages();
    localStore.saveMessages([...msgs, newMsg]);

    // Update conversation timestamp & last message
    conv.lastMessage = content;
    conv.updatedAt = now;
    localStore.saveConversations(convs);

    // Notify recipient (FR24)
    const recipientId = conv.finderId === senderId ? conv.claimantId : conv.finderId;
    await this.createNotification({
      userId: recipientId,
      type: 'new_message',
      title: `Message from ${senderName}`,
      message: content.length > 80 ? `${content.slice(0, 80)}...` : content,
      linkType: 'conversation',
      linkId: conversationId,
    });

    return newMsg;
  },

  // ALERTS (FR16, FR17, FR25)
  async getAlerts(userId: string): Promise<LostItemAlert[]> {
    const all = localStore.getAlerts();
    return all.filter((a) => a.userId === userId && a.isActive);
  },

  async createAlert(data: {
    userId: string;
    keywords: string;
    category?: string;
    location?: string;
  }): Promise<LostItemAlert> {
    if (!data.keywords.trim() && !data.category && !data.location) {
      throw new Error('At least one search criterion (keyword, category, or location) is required.');
    }

    const newAlert: LostItemAlert = {
      id: `alert-${Date.now()}`,
      userId: data.userId,
      keywords: data.keywords.trim(),
      category: data.category || undefined,
      location: data.location || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const current = localStore.getAlerts();
    localStore.saveAlerts([newAlert, ...current]);
    return newAlert;
  },

  async deleteAlert(alertId: string): Promise<void> {
    const current = localStore.getAlerts();
    localStore.saveAlerts(current.filter((a) => a.id !== alertId));
  },

  // FR17, FR25: Compare newly published listing with active alerts & generate notifications
  async checkAndTriggerAlertNotifications(listing: Listing): Promise<void> {
    if (listing.status !== 'Available') return;

    const allAlerts = localStore.getAlerts().filter((a) => a.isActive && a.userId !== listing.finderId);

    for (const alert of allAlerts) {
      const keywords = alert.keywords
        .toLowerCase()
        .split(/[,\s]+/)
        .map((k) => k.trim())
        .filter(Boolean);

      const titleAndDesc = `${listing.title} ${listing.description}`.toLowerCase();
      
      const keywordMatches = keywords.length === 0 || keywords.some((kw) => titleAndDesc.includes(kw));
      const categoryMatches = !alert.category || alert.category === 'All' || alert.category === listing.category;
      const locationMatches = !alert.location || alert.location === 'All' || listing.locationFound.toLowerCase().includes(alert.location.toLowerCase());

      if (keywordMatches && categoryMatches && locationMatches) {
        await this.createNotification({
          userId: alert.userId,
          type: 'alert_match',
          title: '🚨 Lost Item Alert Match!',
          message: `A new listing matching your alert was posted: "${listing.title}" found at ${listing.locationFound}.`,
          linkType: 'listing',
          linkId: listing.id,
        });
      }
    }
  },

  // NOTIFICATIONS (FR24)
  async getNotifications(userId: string): Promise<AppNotification[]> {
    const all = localStore.getNotifications();
    return all
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async markNotificationRead(id: string): Promise<void> {
    const all = localStore.getNotifications();
    localStore.saveNotifications(all.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    const all = localStore.getNotifications();
    localStore.saveNotifications(all.map((n) => (n.userId === userId ? { ...n, isRead: true } : n)));
  },

  async createNotification(data: {
    userId: string;
    type: AppNotification['type'];
    title: string;
    message: string;
    linkType: AppNotification['linkType'];
    linkId: string;
  }): Promise<AppNotification> {
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      linkType: data.linkType,
      linkId: data.linkId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const current = localStore.getNotifications();
    localStore.saveNotifications([notif, ...current]);
    return notif;
  },

  // REPORTING & MODERATION (FR26-FR32)
  async createReport(data: {
    reporterId: string;
    reporterName: string;
    contentType: 'listing' | 'message';
    contentId: string;
    ownerId: string;
    ownerName: string;
    reason: string;
    contentSnippet: string;
  }): Promise<ReportItem> {
    if (!data.reason.trim()) {
      throw new Error('A reason is required to submit a report.');
    }

    const report: ReportItem = {
      id: `report-${Date.now()}`,
      reporterId: data.reporterId,
      reporterName: data.reporterName,
      contentType: data.contentType,
      contentId: data.contentId,
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      reason: data.reason.trim(),
      contentSnippet: data.contentSnippet,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    const current = localStore.getReports();
    localStore.saveReports([report, ...current]);
    return report;
  },

  async getReports(): Promise<ReportItem[]> {
    const all = localStore.getReports();
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async resolveReport(
    reportId: string,
    status: 'Dismissed' | 'Confirmed',
    adminId: string,
    adminName: string,
    notes?: string
  ): Promise<ReportItem> {
    const reports = localStore.getReports();
    const report = reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Report not found');

    const now = new Date().toISOString();
    const updated: ReportItem = {
      ...report,
      status,
      resolvedBy: adminName,
      resolvedAt: now,
      adminNotes: notes || '',
    };

    localStore.saveReports(reports.map((r) => (r.id === reportId ? updated : r)));

    // Record in Admin Audit Log (FR32)
    await this.addAuditLog({
      adminId,
      adminName,
      action: 'RESOLVE_REPORT',
      targetId: report.contentId,
      targetType: report.contentType,
      reason: `Report marked as ${status}. Admin notes: ${notes || 'None'}`,
    });

    return updated;
  },

  // FR29, FR30: Admin removes invalid content and notifies owner
  async removeListing(listingId: string, adminId: string, adminName: string, reason: string): Promise<void> {
    const listings = localStore.getListings();
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) throw new Error('Listing not found');

    listing.isRemoved = true;
    listing.moderationReason = reason;
    localStore.saveListings(listings);

    // Notify content owner (FR30)
    await this.createNotification({
      userId: listing.finderId,
      type: 'content_removed',
      title: 'Listing Removed by Administrator',
      message: `Your listing "${listing.title}" was removed. Reason: ${reason}`,
      linkType: 'listing',
      linkId: listing.id,
    });

    // Record audit log (FR32)
    await this.addAuditLog({
      adminId,
      adminName,
      action: 'REMOVE_LISTING',
      targetId: listingId,
      targetType: 'listing',
      reason,
    });
  },

  async removeMessage(messageId: string, adminId: string, adminName: string, reason: string): Promise<void> {
    const messages = localStore.getMessages();
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) throw new Error('Message not found');

    msg.isRemoved = true;
    localStore.saveMessages(messages);

    // Notify message owner
    await this.createNotification({
      userId: msg.senderId,
      type: 'content_removed',
      title: 'Message Removed by Administrator',
      message: `A message you sent was removed for violating community guidelines. Reason: ${reason}`,
      linkType: 'conversation',
      linkId: msg.conversationId,
    });

    // Record audit log (FR32)
    await this.addAuditLog({
      adminId,
      adminName,
      action: 'REMOVE_MESSAGE',
      targetId: messageId,
      targetType: 'message',
      reason,
    });
  },

  // FR31, FR32: User account management (suspend, restore)
  async setAccountSuspension(
    userId: string,
    isSuspended: boolean,
    adminId: string,
    adminName: string,
    reason: string
  ): Promise<UserProfile> {
    const users = localStore.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');

    user.isSuspended = isSuspended;
    localStore.saveUsers(users);

    await this.addAuditLog({
      adminId,
      adminName,
      action: isSuspended ? 'SUSPEND_USER' : 'RESTORE_USER',
      targetId: userId,
      targetType: 'user',
      reason,
    });

    return user;
  },

  async getUsers(): Promise<UserProfile[]> {
    return localStore.getUsers();
  },

  async getAuditLogs(): Promise<AdminAuditLog[]> {
    const logs = localStore.getAuditLogs();
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async addAuditLog(data: {
    adminId: string;
    adminName: string;
    action: AdminAuditLog['action'];
    targetId: string;
    targetType: AdminAuditLog['targetType'];
    reason: string;
  }): Promise<AdminAuditLog> {
    const log: AdminAuditLog = {
      id: `audit-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    const logs = localStore.getAuditLogs();
    localStore.saveAuditLogs([log, ...logs]);
    return log;
  },
};
