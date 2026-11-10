// Identify uploads by their magic bytes, never by the browser-supplied
// Content-Type or file name (those are trivially spoofed).

export const LIMITS = {
  image: 8 * 1024 * 1024,   // 8 MB per photo
  video: 60 * 1024 * 1024,  // 60 MB per video
  imagesPerCar: 6,
  videosPerCar: 1,
};

const ascii = (buf, start, end) => buf.subarray(start, end).toString('latin1');

/** @returns {{type:string, ext:string, kind:'image'|'video'} | {error:string}} */
export function sniff(head) {
  if (!head || head.length < 12) return { error: 'File is empty or too small.' };
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { type: 'image/jpeg', ext: 'jpg', kind: 'image' };
  }
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: 'image/png', ext: 'png', kind: 'image' };
  }
  if (ascii(head, 0, 6) === 'GIF87a' || ascii(head, 0, 6) === 'GIF89a') {
    return { type: 'image/gif', ext: 'gif', kind: 'image' };
  }
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP') {
    return { type: 'image/webp', ext: 'webp', kind: 'image' };
  }
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    return { type: 'video/webm', ext: 'webm', kind: 'video' };
  }
  if (ascii(head, 4, 8) === 'ftyp') {
    const brand = ascii(head, 8, 12);
    if (brand === 'avif' || brand === 'avis') return { type: 'image/avif', ext: 'avif', kind: 'image' };
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return { error: 'HEIC photos are not supported by most browsers. Please export as JPEG.' };
    }
    if (brand === 'qt  ') return { type: 'video/quicktime', ext: 'mov', kind: 'video' };
    return { type: 'video/mp4', ext: 'mp4', kind: 'video' };
  }
  return { error: 'Unsupported file. Use JPEG, PNG, WebP, GIF, AVIF photos or MP4, MOV, WebM videos.' };
}
