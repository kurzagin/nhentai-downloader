/**
 * Image format indicators used by nHentai:
 * 'j' -> 'jpg'
 * 'p' -> 'png'
 * 'g' -> 'gif'
 * 'w' -> 'webp'
 */
export type ImageType = 'j' | 'p' | 'g' | 'w';

export interface ImageMetadata {
  t: ImageType | string;
  w: number;
  h: number;
}

export interface GalleryTag {
  id: number;
  type: string;
  name: string;
  url: string;
  count: number;
}

export interface GalleryTitle {
  english: string;
  japanese?: string;
  pretty: string;
}

export interface GalleryImages {
  pages: ImageMetadata[];
  cover: ImageMetadata;
  thumbnail: ImageMetadata;
}

export interface Gallery {
  id: number | string;
  media_id: string;
  title: GalleryTitle;
  images: GalleryImages;
  scanlator?: string;
  upload_date: number;
  tags: GalleryTag[];
  num_pages: number;
  num_favorites?: number;
}

export interface ClientOptions {
  /**
   * Optional API key if using authenticated endpoints or custom proxy.
   */
  apiKey?: string;
  /**
   * Base URL for the API.
   * Defaults to https://nhentai.net
   */
  baseUrl?: string;
  /**
   * Custom image host (defaults to https://i.nhentai.net)
   */
  imageBaseUrl?: string;
  /**
   * Custom thumbnail host (defaults to https://t.nhentai.net)
   */
  thumbBaseUrl?: string;
  /**
   * Custom request fetcher (defaults to global fetch).
   * Can be used to inject custom proxies, headers, or agent.
   */
  fetch?: typeof fetch;
  /**
   * Custom User-Agent header (for Node.js environments)
   */
  userAgent?: string;
  /**
   * Optional cookies or session tokens (e.g., cf_clearance, csrftoken)
   */
  cookie?: string;
}

export interface DownloadProgress {
  current: number;
  total: number;
  pageIndex: number;
  percentage: number;
  stage: 'downloading' | 'compressing' | 'done';
}

export interface DownloadOptions {
  /**
   * Number of concurrent image downloads. Default: 3.
   */
  concurrency?: number;
  /**
   * Progress callback.
   */
  onProgress?: (progress: DownloadProgress) => void;
  /**
   * AbortSignal to cancel download.
   */
  signal?: AbortSignal;
}
