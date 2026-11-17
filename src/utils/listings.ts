import type { Listing } from '../types';
import type { ListingOptions } from '../services/db';
import { ITEM_CATEGORIES } from './constants';

export function campusDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function dateBounds(range: string, now = new Date()): { dateFrom?: string; dateTo?: string } {
  if (range === 'all') return {};
  const dateTo = campusDate(now);
  const days = ({ today: 1, '3days': 3, '7days': 7, '30days': 30 } as Record<string, number>)[range];
  if (!days) return {};
  const start = new Date(`${dateTo}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { dateFrom: start.toISOString().slice(0, 10), dateTo };
}
export function listingErrors(data: Pick<Listing, 'title' | 'description' | 'photoUrl' | 'category' | 'locationFound' | 'dateFound'>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (data.title.trim().length < 4) errors.title = 'Title must be at least 4 characters.';
  if (data.description.trim().length < 10) errors.description = 'Description must be at least 10 characters.';
  if (!/^(https?:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/.test(data.photoUrl.trim())) errors.photoUrl = 'Upload a photo or provide an image URL.';
  if (data.photoUrl.length > 7000000) errors.photoUrl = 'Photo must be smaller than 5 MB.';
  if (!ITEM_CATEGORIES.includes(data.category)) errors.category = 'Choose an item category.';
  if (!data.locationFound.trim()) errors.locationFound = 'Location is required.';
  const date = new Date(`${data.dateFound}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dateFound) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== data.dateFound) errors.dateFound = 'Provide a valid date.';
  else if (data.dateFound > campusDate()) errors.dateFound = 'Date found cannot be in the future.';
  return errors;
}
export function validateListing(data: Parameters<typeof listingErrors>[0]): void {
  const errors = listingErrors(data);
  if (Object.keys(errors).length) throw new Error(Object.values(errors).join(' '));
}
export function filterListings(listings: Listing[], options: ListingOptions = {}): Listing[] {
  const words = options.keyword?.trim().toLowerCase().split(/\s+/).filter(Boolean) || [];
  const score = (item: Listing) => words.reduce((n, word) => n + (item.title.toLowerCase().includes(word) ? 10 : 0) + (item.description.toLowerCase().includes(word) ? 3 : 0), 0);
  return listings.filter((item) => !item.isRemoved &&
    (!options.finderId || item.finderId === options.finderId) &&
    (options.includeReturned || options.finderId || options.claimantId || item.status !== 'Returned') &&
    (!words.length || score(item) > 0) &&
    (!options.category || options.category === 'All' || item.category === options.category) &&
    (!options.location || options.location === 'All' || item.locationFound === options.location) &&
    (!options.dateFrom || item.dateFound >= options.dateFrom) && (!options.dateTo || item.dateFound <= options.dateTo)
  ).sort((a, b) => (options.sort !== 'newest' ? score(b) - score(a) : 0) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
