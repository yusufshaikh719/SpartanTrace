import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Listing, ItemCategory } from '../types';
import { ITEM_CATEGORIES, SJSU_LOCATIONS } from '../utils/constants';
import { dbService } from '../services/db';
import { readPhoto } from '../utils/photos';
import { campusDate, listingErrors } from '../utils/listings';

interface EditItemModalProps {
  listing: Listing;
  onClose: () => void;
  onSuccess: (updated: Listing) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({ listing, onClose, onSuccess }) => {
  const todayStr = campusDate();

  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [photoUrl, setPhotoUrl] = useState(listing.photoUrl);
  const [category, setCategory] = useState<ItemCategory>(listing.category);
  const [locationFound, setLocationFound] = useState(listing.locationFound);
  const [dateFound, setDateFound] = useState(listing.dateFound);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);

  const validate = () => {
    const errs = listingErrors({ title, description, photoUrl, category, locationFound, dateFound });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsReadingPhoto(true);
    try {
      setPhotoUrl(await readPhoto(file));
      setErrors((previous) => ({ ...previous, photoUrl: '' }));
    } catch (error) {
      setErrors((previous) => ({ ...previous, photoUrl: error instanceof Error ? error.message : 'Could not load photo.' }));
    } finally { setIsReadingPhoto(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadingPhoto || !validate()) return;

    setIsSubmitting(true);
    try {
      // FR10: Update existing listing without creating duplicate, records last-updated date/time
      const updated = await dbService.updateListing(listing.id, {
        title: title.trim(),
        description: description.trim(),
        photoUrl: photoUrl.trim(),
        category,
        locationFound: locationFound.trim(),
        dateFound,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Found Item</h2>
            <p className="text-xs text-slate-500">Update listing details without creating duplicates</p>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Title *
            </label>
            <input
              aria-label="Item title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:outline-sjsu-500"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-photo-url" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Item photo *</label>
            <div className="flex items-center gap-3">
              {photoUrl && <img src={photoUrl} alt="Updated item preview" className="w-16 h-16 object-cover rounded-xl border" />}
              <label className="text-xs text-sjsu-600 font-semibold cursor-pointer">Replace photo
                <input aria-label="Replace photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={isReadingPhoto} onChange={handlePhoto} className="block mt-1 text-xs max-w-full" />
              </label>
            </div>
            <input id="edit-photo-url" aria-label="Photo URL" type="text" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2" placeholder="https://example.com/item.jpg" />
            {isReadingPhoto && <p role="status" className="text-xs text-neutral-500">Reading photo…</p>}
            {errors.photoUrl && <p role="alert" className="text-xs text-red-600">{errors.photoUrl}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                aria-label="Category"
              value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-sjsu-500"
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date Found *
              </label>
              <input
                aria-label="Date found"
              type="date"
                max={todayStr}
                value={dateFound}
                onChange={(e) => setDateFound(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-sjsu-500"
              />
              {errors.dateFound && <p className="text-xs text-red-500 mt-1">{errors.dateFound}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Location Found *
            </label>
            <select
              aria-label="Location found"
              value={locationFound}
              onChange={(e) => setLocationFound(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-sjsu-500"
            >
              {SJSU_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description *
            </label>
            <textarea
              aria-label="Description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:outline-sjsu-500"
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isReadingPhoto}
              className="bg-sjsu-500 hover:bg-sjsu-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Edits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
