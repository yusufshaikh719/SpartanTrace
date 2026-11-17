export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export function readPhoto(file: File): Promise<string> {
  if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
    return Promise.reject(new Error('Choose a PNG, JPEG, WebP, or GIF smaller than 5 MB.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this photo. Please choose it again.'));
    reader.onabort = () => reject(new Error('Photo upload was cancelled.'));
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Could not read this photo.'));
    reader.readAsDataURL(file);
  });
}
