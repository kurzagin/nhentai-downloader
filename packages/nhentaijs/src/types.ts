export interface CoverInfo {
  path: string;
  width: number;
  height: number;
}

export interface PageInfo {
  number: number;
  path: string;
  width: number;
  height: number;
  thumbnail: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

export interface GalleryTag {
  id: number;
  type: string;
  name: string;
  url?: string;
  count?: number;
}

export interface GalleryTitle {
  english: string;
  japanese?: string;
  pretty: string;
}

export interface CdnConfig {
  image_servers: string[];
  thumb_servers: string[];
}

export interface Gallery {
  id: number | string;
  media_id: string;
  title: GalleryTitle;
  cover: CoverInfo;
  thumbnail?: CoverInfo;
  pages: PageInfo[];
  scanlator?: string;
  upload_date: number;
  tags: GalleryTag[];
  num_pages: number;
  num_favorites?: number;
}

export interface ClientOptions {
  /**
   * Optional API key (passed as `Authorization: Key <api_key>`).
   */
  apiKey?: string;
  /**
   * Base URL for the API.
   * Defaults to https://nhentai.net
   */
  baseUrl?: string;
  /**
   * Base URL for image CDN.
   * Defaults to https://i1.nhentai.net
   */
  imageBaseUrl?: string;
  /**
   * Base URL for thumbnail CDN.
   * Defaults to https://t1.nhentai.net
   */
  thumbBaseUrl?: string;
  /**
   * Custom request fetcher (defaults to global fetch).
   */
  fetch?: typeof fetch;
  /**
   * Custom User-Agent header (defaults to nhentaijs/1.0.0).
   */
  userAgent?: string;
  /**
   * Optional cookies or session tokens.
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
