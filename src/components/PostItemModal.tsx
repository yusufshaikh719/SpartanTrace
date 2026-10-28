import React, { useState } from 'react';
import { X, Upload, MapPin, Calendar, AlertCircle, Check, Image as ImageIcon } from 'lucide-react';
import { ItemCategory } from '../types';
import { ITEM_CATEGORIES, SJSU_LOCATIONS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { getCampusPlaceholderImage } from '../utils/formatters';

interface PostItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const PostItemModal: React.FC<PostItemModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const todayStr = getLocalDateString();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [locationFound, setLocationFound] = useState(SJSU_LOCATIONS[0]);
  const [dateFound, setDateFound] = useState(todayStr);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!category) {
      errs.category = 'Category is required';
    }

    if (!locationFound.trim()) {
      errs.locationFound = 'Campus location is required';
    }

    if (!dateFound) {
      errs.dateFound = 'Date found is required';
    } else if (dateFound > todayStr) {
      errs.dateFound = 'Date found cannot be in the future';
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

    let finalPhoto = photoUrl.trim() || customPhotoInput.trim();
    if (!finalPhoto) {
      finalPhoto = getCampusPlaceholderImage(category, title || category);
      setPhotoUrl(finalPhoto);
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.createListing({
        finderId: user.id,
        finderName: user.name,
        finderEmail: user.email,
        title: title.trim(),
        description: description.trim(),
        photoUrl: finalPhoto,
        category,
        locationFound: locationFound.trim(),
        dateFound,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit found item listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-neutral-900">Report Found Item</h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">Post a found item to the SJSU campus registry</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form id="post-item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Photos Section */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Item Photo
            </label>

            {photoUrl ? (
              <div className="rounded-2xl bg-neutral-100 overflow-hidden border border-neutral-200 p-2.5 flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-200 shrink-0 border border-neutral-200">
                  <img
                    src={photoUrl}
                    alt="Item preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 truncate">Photo attached</p>
                  <p className="text-[11px] text-neutral-500">Ready for campus verification</p>
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="mt-1 text-xs text-red-600 hover:text-red-700 font-semibold hover:underline"
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-neutral-300 hover:border-sjsu-500 bg-neutral-50 hover:bg-white rounded-xl cursor-pointer text-xs font-semibold text-neutral-700 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-sjsu-600" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const svg = getCampusPlaceholderImage(category, title || category);
                      setPhotoUrl(svg);
                    }}
                    className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 transition-colors shrink-0"
                  >
                    Use SJSU Badge
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Or paste direct image URL..."
                    value={customPhotoInput}
                    onChange={(e) => setCustomPhotoInput(e.target.value)}
                    className="flex-1 text-xs border border-neutral-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-neutral-900"
                  />
                  {customPhotoInput.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl(customPhotoInput.trim());
                        setCustomPhotoInput('');
                      }}
                      className="text-xs bg-neutral-900 text-white px-3 py-1.5 rounded-xl font-semibold hover:bg-neutral-800 transition-colors"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Item Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Hydro Flask 32oz Wide Mouth (Deep Blue)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full text-xs sm:text-sm border rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors ${
                errors.title ? 'border-red-400 bg-red-50/20' : 'border-neutral-200 focus:border-neutral-900'
              }`}
            />
            {errors.title && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
              </p>
            )}
          </div>

          {/* Category & Date Found */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full text-xs sm:text-sm border border-neutral-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-neutral-900 text-neutral-800"
              >
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Date Found *
              </label>
              <input
                type="date"
                max={todayStr}
                value={dateFound}
                onChange={(e) => setDateFound(e.target.value)}
                className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2 bg-white focus:outline-none transition-colors text-neutral-800 ${
                  errors.dateFound ? 'border-red-400 bg-red-50/20' : 'border-neutral-200 focus:border-neutral-900'
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
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Campus Location Found *
            </label>
            <select
              value={locationFound}
              onChange={(e) => setLocationFound(e.target.value)}
              className="w-full text-xs sm:text-sm border border-neutral-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-neutral-900 text-neutral-800"
            >
              {SJSU_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Description */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Detailed Description *
            </label>
            <textarea
              rows={3}
              placeholder="Describe distinguishing marks, exact room or area, or whether it was handed to a front desk..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full text-xs sm:text-sm border rounded-xl px-3.5 py-2 focus:outline-none transition-colors ${
                errors.description ? 'border-red-400 bg-red-50/20' : 'border-neutral-200 focus:border-neutral-900'
              }`}
            />
            {errors.description && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.description}
              </p>
            )}
          </div>
        </form>

        {/* Pinned Action Footer (Always Visible!) */}
        <div className="px-6 py-3.5 border-t border-neutral-100 bg-neutral-50/70 shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="post-item-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-sjsu-600 hover:bg-sjsu-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>Publishing...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Publish to Registry</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
