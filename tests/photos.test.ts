import { test, expect } from 'vitest';
import { readPhoto, MAX_PHOTO_BYTES } from '../src/utils/photos';

test('unsupported or oversized photos are rejected before reading browser data', async () => {
  await expect(readPhoto(new File(['not an image'],'item.txt',{type:'text/plain'}))).rejects.toThrow(/Choose a PNG/);
  const file=new File([new Uint8Array(MAX_PHOTO_BYTES+1)],'large.png',{type:'image/png'});
  await expect(readPhoto(file)).rejects.toThrow(/5 MB/);
});
