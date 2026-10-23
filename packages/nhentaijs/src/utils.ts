/**
 * Maps NHentai internal single-letter image type indicators to file extensions.
 */
export function getExtension(type: string): string {
  switch (type) {
    case 'j':
      return 'jpg';
    case 'p':
      return 'png';
    case 'g':
      return 'gif';
    case 'w':
      return 'webp';
    default:
      return type || 'jpg';
  }
}

/**
 * Extracts gallery ID from raw input (numeric string, nhentai URL, or path).
 *
 * Supported formats:
 * - "521265"
 * - "https://nhentai.net/g/521265/"
 * - "https://nhentai.net/g/521265/1/"
 * - "/g/521265"
 */
export function parseGalleryId(input: string | number): string {
  const str = String(input).trim();
  const match = str.match(/(?:(?:nhentai\.net)?\/g\/|^)(\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (/^\d+$/.test(str)) {
    return str;
  }
  throw new Error(`Unable to extract valid gallery ID from input: "${input}"`);
}

/**
 * Sanitizes a title for safe use as a filename or zip folder name.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
    .substring(0, 150) || 'gallery';
}
