import { getSupabaseClient } from '../lib/supabase';
import { Listing, Claim, Conversation, Message, LostItemAlert, AppNotification, ReportItem, AdminAuditLog, UserProfile, ListingStatus, ItemCategory } from '../types';
import { filterListings, validateListing } from '../utils/listings';

export function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Connect Supabase in Database Settings before using SpartanTrace.');
  return client;
}

const schemaChecks = new WeakMap<object, Promise<void>>();
export async function assertDatabaseReady() {
  const client = requireClient();
  let check = schemaChecks.get(client);
  if (!check) {
    check = (async () => {
      const { data, error } = await client.rpc('app_version');
      if (error || data !== 2) throw new Error('SpartanTrace database setup is incomplete. Open Database Settings for setup instructions.');
    })();
    schemaChecks.set(client, check);
  }
  try { await check; }
  catch (error) { schemaChecks.delete(client); throw error; }
  return client;
}

// Keep the API model independent of PostgreSQL column naming.
export function fromRow<T>(row: unknown): T {
  if (Array.isArray(row)) return row.map((r) => fromRow(r)) as T;
  if (row !== null && typeof row === 'object') {
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), fromRow(value)])) as T;
  }
  return row as T;
}

export async function action<T>(name: string, payload: object = {}): Promise<T> {
  const client = await assertDatabaseReady();
  const { data, error } = await client.rpc('app_action', { action: name, payload });
  if (error) throw new Error(error.message);
  return fromRow<T>(data);
}

async function rows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return fromRow<T>(data);
}

async function allRows<T>(page: (start: number, end: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const results: T[] = [];
  for (let start = 0; ; start += 1000) {
    const batch = await rows<T[]>(page(start, start + 999));
    results.push(...batch);
    if (batch.length < 1000) return results;
  }
}

export interface ListingOptions {
  keyword?: string; category?: string; location?: string; dateFrom?: string; dateTo?: string;
  sort?: 'relevance' | 'newest'; includeReturned?: boolean; finderId?: string; claimantId?: string;
}
type ListingInput = { finderId: string; finderName: string; finderEmail: string; title: string; description: string; photoUrl: string; category: ItemCategory; locationFound: string; dateFound: string };

const listingColumns = 'id,finder_id,finder_name,title,description,photo_url,category,location_found,date_found,status,return_date,is_removed,moderation_reason,created_at,updated_at';
export const dbService = {
  async isSupabaseConnected(): Promise<boolean> {
    try {
      // Version check also verifies that the secure workflow migration was applied.
      const { data, error } = await requireClient().rpc('app_version');
      return !error && data === 2;
    } catch { return false; }
  },
  async getListings(options: ListingOptions = {}): Promise<Listing[]> {
    const client = await assertDatabaseReady();
    let batches: (string[] | undefined)[] = [undefined];
    if (!options.finderId && options.claimantId) {
      const claims = await this.getClaimsByUser(options.claimantId);
      const ids = [...new Set(claims.map((claim) => claim.listingId))];
      if (!ids.length) return [];
      // Keep PostgREST request URLs below proxy limits for large histories.
      batches = [];
      for (let start = 0; start < ids.length; start += 100) batches.push(ids.slice(start, start + 100));
    }
    const listings: Listing[] = [];
    for (const ids of batches) {
      listings.push(...await allRows<Listing>((start, end) => {
        let query = client.from('listings').select(listingColumns).eq('is_removed', false);
        if (options.finderId) query = query.eq('finder_id', options.finderId);
        else if (ids) query = query.in('id', ids);
        else if (!options.includeReturned) query = query.neq('status', 'Returned');
        return query.order('id').range(start, end);
      }));
    }
    return filterListings(listings, options);
  },
  async getListingById(id: string): Promise<Listing | null> {
    return rows<Listing | null>(requireClient().from('listings').select(listingColumns).eq('id', id).maybeSingle());
  },
  async createListing(data: ListingInput): Promise<Listing> {
    validateListing(data);
    return action('create_listing', data);
  },
  async updateListing(id: string, updates: Partial<Pick<Listing, 'title' | 'description' | 'photoUrl' | 'category' | 'locationFound' | 'dateFound'>>): Promise<Listing> {
    const listing = await this.getListingById(id);
    if (!listing) throw new Error('Listing not found.');
    const updated = { ...listing, ...updates };
    validateListing(updated);
    return action('update_listing', { ...updated, id });
  },
  async updateListingStatus(id: string, status: ListingStatus, returnDetails?: { confirmedBy: string }): Promise<Listing> {
    return action('listing_status', { id, status, confirmed: Boolean(returnDetails?.confirmedBy) });
  },
  async getClaimsForListing(listingId: string): Promise<Claim[]> {
    return allRows<Claim>((start, end) => requireClient().from('claims').select('*').eq('listing_id', listingId).order('created_at', { ascending: false }).order('id').range(start, end));
  },
  async getClaimsByUser(userId: string): Promise<Claim[]> {
    return allRows<Claim>((start, end) => requireClient().from('claims').select('*').eq('claimant_id', userId).order('created_at', { ascending: false }).order('id').range(start, end));
  },
  async createClaim(data: { listingId: string; claimantId: string; claimantName: string; claimantEmail: string; proofDescription: string }): Promise<{ claim: Claim; conversation: Conversation }> {
    return action('create_claim', data);
  },
  async updateClaimStatus(id: string, status: 'Accepted' | 'Rejected'): Promise<Claim> { return action('claim_status', { id, status }); },
  async getConversations(_userId: string): Promise<Conversation[]> { return action('conversations'); },
  async getMessages(conversationId: string): Promise<Message[]> {
    return allRows<Message>((start, end) => requireClient().from('messages').select('*').eq('conversation_id', conversationId).eq('is_removed', false).order('created_at').order('id').range(start, end));
  },
  async sendMessage(id: string, _senderId: string, _senderName: string, content: string): Promise<Message> { return action('send_message', { id, content }); },
  async getAlerts(userId: string): Promise<LostItemAlert[]> {
    return allRows<LostItemAlert>((start, end) => requireClient().from('lost_item_alerts').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).order('id').range(start, end));
  },
  async createAlert(data: { userId: string; keywords: string; category?: string; location?: string; dateLost?: string }): Promise<LostItemAlert> { return action('create_alert', data); },
  async deleteAlert(id: string): Promise<void> { await action('delete_alert', { id }); },
  async getNotifications(userId: string): Promise<AppNotification[]> {
    return allRows<AppNotification>((start, end) => requireClient().from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(start, end));
  },
  async markNotificationRead(id: string): Promise<void> { await action('read_notification', { id }); },
  async markAllNotificationsRead(_userId: string): Promise<void> { await action('read_all_notifications'); },
  async createReport(data: Omit<ReportItem, 'id' | 'status' | 'createdAt'>): Promise<ReportItem> { return action('create_report', data); },
  async getReports(): Promise<ReportItem[]> { return allRows<ReportItem>((start, end) => requireClient().from('reports').select('*').order('created_at', { ascending: false }).order('id').range(start, end)); },
  async getReportContext(id: string): Promise<Record<string, unknown>> { return action('report_context', { id }); },
  async resolveReport(id: string, status: 'Dismissed' | 'Confirmed', _adminId: string, _adminName: string, reason?: string): Promise<ReportItem> { return action('resolve_report', { id, status, reason }); },
  async removeListing(id: string, _adminId: string, _adminName: string, reason: string): Promise<void> { await action('remove_listing', { id, reason }); },
  async removeMessage(id: string, _adminId: string, _adminName: string, reason: string): Promise<void> { await action('remove_message', { id, reason }); },
  async setAccountSuspension(id: string, isSuspended: boolean, _adminId: string, _adminName: string, reason: string): Promise<UserProfile> { return action('suspend_user', { id, isSuspended, reason }); },
  async getUsers(): Promise<UserProfile[]> { return allRows<UserProfile>((start, end) => requireClient().from('profiles').select('*').order('created_at', { ascending: false }).order('id').range(start, end)); },
  async getAuditLogs(): Promise<AdminAuditLog[]> { return allRows<AdminAuditLog>((start, end) => requireClient().from('admin_audit_logs').select('*').order('created_at', { ascending: false }).order('id').range(start, end)); },
};
