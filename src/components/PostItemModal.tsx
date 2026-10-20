import React, { useState } from 'react';
import { X, Upload, Camera, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { ItemCategory } from '../types';
import { ITEM_CATEGORIES, SJSU_LOCATIONS, SAMPLE_PHOTOS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';

interface PostItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const PostItemModal: React.FC<PostItemModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState(SAMPLE_PHOTOS[0].url);
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [locationFound, setLocationFound] = useState(SJSU_LOCATIONS[0]);
  const [dateFound, setDateFound] = useState(todayStr);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FR02 validation check
  const validate = () => {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Title is required';
    } else if (title.trim().length < 4) {
      errs.title = 'Title must be at least 4 characters';
    }

    if (!description.trim()) {
      errs.description = 'Description is required';
    } else if (description.trim().length < 10) {
      errs.description = 'Please provide more details (at least 10 characters)';
    }

    if (!photoUrl.trim()) {
      errs.photoUrl = 'A photo is required for visual identification';
    }

    if (!category) {
      errs.category = 'Category is required';
    }

    if (!locationFound.trim()) {
      errs.locationFound = 'Location where item was found is required';
    }

    if (!dateFound) {
      errs.dateFound = 'Date found is required';
    } else if (dateFound > todayStr) {
      errs.dateFound = 'Date found cannot be later than current date';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
          setCustomPhotoInput('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in with your SJSU account to report a found item.');
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // FR01, FR03
      await dbService.createListing({
        finderId: user.id,
        finderName: user.name,
        finderEmail: user.email,
        title: title.trim(),
        description: description.trim(),
        photoUrl: photoUrl.trim(),
        category,
        locationFound: locationFound.trim(),
        dateFound,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Post a Found Item (FR01)</h2>
            <p className="text-xs text-slate-500">
              Report an item found on SJSU campus so its owner can safely retrieve it
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {/* Photos Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Item Photo *
            </label>

            {/* Photo Preview & Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="aspect-4/3 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 relative group">
                <img
                  src={photoUrl}
                  alt="Item preview"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  Active Photo
                </span>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="flex items-center justify-center gap-2 p-2.5 border border-slate-300 hover:border-sjsu-500 bg-slate-50 hover:bg-white text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-sjsu-500" />
                  <span>Upload Image from Device</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Or paste an image URL..."
                    value={customPhotoInput}
                    onChange={(e) => setCustomPhotoInput(e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-sjsu-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customPhotoInput.trim()) setPhotoUrl(customPhotoInput.trim());
                    }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-semibold text-slate-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Sample Preset Photos for easy testing */}
            <div className="pt-1">
              <span className="text-[11px] text-slate-400 block mb-1">
                Preset sample photos:
              </span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {SAMPLE_PHOTOS.map((sp) => (
                  <button
                    key={sp.name}
                    type="button"
                    onClick={() => {
                      setPhotoUrl(sp.url);
                      setCategory(sp.category as ItemCategory);
                      if (!title) setTitle(sp.name);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-medium whitespace-nowrap text-slate-700 transition-colors"
                  >
                    {sp.name}
                  </button>
                ))}
              </div>
            </div>
            {errors.photoUrl && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.photoUrl}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Item Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Apple AirPods Pro in blue silicone case"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full text-xs sm:text-sm border rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors ${
                errors.title ? 'border-red-400 bg-red-50/20' : 'border-slate-300 focus:border-sjsu-500'
              }`}
            />
            {errors.title && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
              </p>
            )}
          </div>

          {/* Category & Date Found */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:border-sjsu-500 text-slate-800"
              >
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Date Found * (Max: Today)
              </label>
              <input
                type="date"
                max={todayStr}
                value={dateFound}
                onChange={(e) => setDateFound(e.target.value)}
                className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2 bg-white focus:outline-none transition-colors ${
                  errors.dateFound ? 'border-red-400 bg-red-50/20' : 'border-slate-300 focus:border-sjsu-500'
                }`}
              />
              {errors.dateFound && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.dateFound}
                </p>
              )}
            </div>
          </div>

          {/* Location Found */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              SJSU Campus Location Found *
            </label>
            <div className="relative">
              <select
                value={locationFound}
                onChange={(e) => setLocationFound(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white focus:outline-none focus:border-sjsu-500 text-slate-800"
              >
                {SJSU_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            {errors.locationFound && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.locationFound}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description & Identifying Details *
            </label>
            <textarea
              rows={3}
              placeholder="Describe where it was sitting, condition, etc. Keep private details (like passcode or serial number) undisclosed so claimants can prove ownership..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full text-xs sm:text-sm border rounded-xl p-3 focus:outline-none transition-colors ${
                errors.description ? 'border-red-400 bg-red-50/20' : 'border-slate-300 focus:border-sjsu-500'
              }`}
            />
            {errors.description && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.description}
              </p>
            )}
          </div>

          {/* Validation Notice / Actions */}
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
              disabled={isSubmitting}
              className="bg-sjsu-500 hover:bg-sjsu-600 active:bg-sjsu-700 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Found Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
