import type { ClientOptions, DownloadOptions, DownloadProgress, Gallery } from './types';
import { getExtension, parseGalleryId, sanitizeFilename } from './utils';
import JSZip from 'jszip';

export class NHentaiClient {
  private baseUrl: string;
  private imageBaseUrl: string;
  private thumbBaseUrl: string;
  private apiKey?: string;
  private fetchFn: typeof fetch;
  private userAgent?: string;
  private cookie?: string;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://nhentai.net').replace(/\/+$/, '');
    this.imageBaseUrl = (options.imageBaseUrl || 'https://i.nhentai.net').replace(/\/+$/, '');
    this.thumbBaseUrl = (options.thumbBaseUrl || 'https://t.nhentai.net').replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetch || (typeof globalThis !== 'undefined' ? globalThis.fetch.bind(globalThis) : fetch);
    this.userAgent = options.userAgent;
    this.cookie = options.cookie;
  }

  /**
   * Builds common headers including optional API key, user agent, and cookies.
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-API-Key'] = this.apiKey;
    }

    if (this.userAgent) {
      headers['User-Agent'] = this.userAgent;
    }

    if (this.cookie) {
      headers['Cookie'] = this.cookie;
    }

    return headers;
  }

  /**
   * Fetches gallery metadata by URL or ID.
   * Checks both API v2 and v1 endpoints for resilience.
   */
  async getGallery(input: string | number): Promise<Gallery> {
    const id = parseGalleryId(input);
    const headers = this.getHeaders();

    // 1. Attempt API v2 endpoint
    try {
      const v2Url = `${this.baseUrl}/api/v2/galleries/${id}`;
      const response = await this.fetchFn(v2Url, { headers });
      if (response.ok) {
        const data = await response.json();
        // Return unwrapped gallery data if inside a data/gallery property or root
        return data?.gallery || data?.data || data;
      }
    } catch {
      // Continue to fallback
    }

    // 2. Fallback to API v1 endpoint
    const v1Url = `${this.baseUrl}/api/gallery/${id}`;
    const res = await this.fetchFn(v1Url, { headers });
    if (!res.ok) {
      let errorDetail = res.statusText || `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.message) {
          errorDetail = errJson.message;
        } else if (errJson?.error) {
          errorDetail = errJson.error;
        }
      } catch {
        // Keep default statusText if body is not JSON
      }
      throw new Error(`Failed to fetch gallery metadata for ID ${id}: ${errorDetail}`);
    }

    return (await res.json()) as Gallery;
  }

  /**
   * Constructs the direct cover image URL.
   */
  getCoverUrl(gallery: Gallery): string {
    const ext = getExtension(gallery.images.cover.t);
    return `${this.thumbBaseUrl}/galleries/${gallery.media_id}/cover.${ext}`;
  }

  /**
   * Constructs the direct page image URL for a given 1-based page number.
   */
  getPageUrl(gallery: Gallery, pageNumber: number): string {
    const pageIndex = pageNumber - 1;
    const pageMeta = gallery.images.pages[pageIndex];
    if (!pageMeta) {
      throw new Error(`Page ${pageNumber} out of range (total pages: ${gallery.num_pages})`);
    }
    const ext = getExtension(pageMeta.t);
    return `${this.imageBaseUrl}/galleries/${gallery.media_id}/${pageNumber}.${ext}`;
  }

  /**
   * Downloads an individual image as an ArrayBuffer.
   */
  async downloadImage(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    const response = await this.fetchFn(url, {
      signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        ...(this.userAgent ? { 'User-Agent': this.userAgent } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download image at ${url}: ${response.statusText} (${response.status})`);
    }

    return await response.arrayBuffer();
  }

  /**
   * Downloads all pages for a gallery and packages them into a Zip file (Uint8Array / Blob).
   */
  async downloadZip(
    input: string | number | Gallery,
    options: DownloadOptions = {}
  ): Promise<{ data: Uint8Array; filename: string; gallery: Gallery }> {
    const gallery: Gallery =
      typeof input === 'object' && 'images' in input ? input : await this.getGallery(input);

    const { concurrency = 3, onProgress, signal } = options;
    const zip = new JSZip();
    const folderName = sanitizeFilename(gallery.title.pretty || gallery.title.english || `nhentai_${gallery.id}`);
    const folder = zip.folder(folderName) || zip;

    const total = gallery.images.pages.length;
    let completedCount = 0;

    // Concurrency pool runner
    const pageTasks = gallery.images.pages.map((pageMeta, idx) => {
      const pageNumber = idx + 1;
      const ext = getExtension(pageMeta.t);
      const filename = `${String(pageNumber).padStart(3, '0')}.${ext}`;
      const url = `${this.imageBaseUrl}/galleries/${gallery.media_id}/${pageNumber}.${ext}`;

      return { pageNumber, filename, url };
    });

    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < pageTasks.length) {
        if (signal?.aborted) {
          throw new DOMException('Download aborted', 'AbortError');
        }

        const taskIndex = cursor++;
        const task = pageTasks[taskIndex];

        try {
          const buffer = await this.downloadImage(task.url, signal);
          folder.file(task.filename, buffer);

          completedCount++;
          if (onProgress) {
            onProgress({
              current: completedCount,
              total,
              pageIndex: task.pageNumber,
              percentage: Math.round((completedCount / total) * 100),
              stage: 'downloading',
            });
          }
        } catch (err) {
          throw new Error(`Error downloading page ${task.pageNumber}: ${(err as Error).message}`);
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(workers);

    if (onProgress) {
      onProgress({
        current: total,
        total,
        pageIndex: total,
        percentage: 100,
        stage: 'compressing',
      });
    }

    const zipData = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    if (onProgress) {
      onProgress({
        current: total,
        total,
        pageIndex: total,
        percentage: 100,
        stage: 'done',
      });
    }

    return {
      data: zipData,
      filename: `${folderName}.zip`,
      gallery,
    };
  }
}
