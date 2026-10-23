import type { ClientOptions, DownloadOptions, DownloadProgress, Gallery } from './types';
import { parseGalleryId, sanitizeFilename } from './utils';
import JSZip from 'jszip';

export class NHentaiClient {
  private baseUrl: string;
  private imageBaseUrl: string;
  private thumbBaseUrl: string;
  private apiKey?: string;
  private fetchFn: typeof fetch;
  private userAgent: string;
  private cookie?: string;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://nhentai.net').replace(/\/+$/, '');
    this.imageBaseUrl = (options.imageBaseUrl || 'https://i1.nhentai.net').replace(/\/+$/, '');
    this.thumbBaseUrl = (options.thumbBaseUrl || 'https://t1.nhentai.net').replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetch || (typeof globalThis !== 'undefined' ? globalThis.fetch.bind(globalThis) : fetch);
    this.userAgent = options.userAgent || 'nhentaijs/1.0.0 (https://github.com/user/nhentaijs)';
    this.cookie = options.cookie;
  }

  /**
   * Builds headers complying with nHentai API v2 requirements.
   * Authentication is passed as `Authorization: Key YOUR_API_KEY`.
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': this.userAgent,
    };

    if (this.apiKey) {
      // Official nHentai API v2 uses `Authorization: Key <api_key>`
      headers['Authorization'] = `Key ${this.apiKey}`;
      headers['X-API-Key'] = this.apiKey;
    }

    if (this.cookie) {
      headers['Cookie'] = this.cookie;
    }

    return headers;
  }

  /**
   * Fetches gallery metadata by URL or ID using official API v2.
   */
  async getGallery(input: string | number): Promise<Gallery> {
    const id = parseGalleryId(input);
    const headers = this.getHeaders();
    const v2Url = `${this.baseUrl}/api/v2/galleries/${id}`;

    const res = await this.fetchFn(v2Url, { headers });

    if (!res.ok) {
      let errorMsg = res.statusText || `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error) {
          errorMsg = errJson.error;
        } else if (errJson?.message) {
          errorMsg = errJson.message;
        }
      } catch {
        // Not JSON
      }

      if (res.status === 429) {
        throw new Error(`Rate limit exceeded on nHentai API (429). Please wait a moment or provide an API Key.`);
      }

      throw new Error(`Failed to fetch gallery metadata for ID ${id}: ${errorMsg}`);
    }

    const data = await res.json();
    return data as Gallery;
  }

  /**
   * Returns the direct cover image URL.
   */
  getCoverUrl(gallery: Gallery): string {
    if (!gallery?.cover?.path) {
      return '';
    }
    const cleanPath = gallery.cover.path.replace(/^\/+/, '');
    return `${this.thumbBaseUrl}/${cleanPath}`;
  }

  /**
   * Returns the direct image URL for a given 1-based page number.
   */
  getPageUrl(gallery: Gallery, pageNumber: number): string {
    const page = gallery.pages?.find((p) => p.number === pageNumber) || gallery.pages?.[pageNumber - 1];
    if (!page?.path) {
      throw new Error(`Page ${pageNumber} not found in gallery`);
    }
    const cleanPath = page.path.replace(/^\/+/, '');
    return `${this.imageBaseUrl}/${cleanPath}`;
  }

  /**
   * Downloads an individual image as an ArrayBuffer.
   */
  async downloadImage(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    const response = await this.fetchFn(url, {
      signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': this.userAgent,
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download image at ${url}: ${response.statusText} (${response.status})`);
    }

    return await response.arrayBuffer();
  }

  /**
   * Downloads all pages for a gallery and packages them into a Zip file (Uint8Array).
   */
  async downloadZip(
    input: string | number | Gallery,
    options: DownloadOptions = {}
  ): Promise<{ data: Uint8Array; filename: string; gallery: Gallery }> {
    const gallery: Gallery =
      typeof input === 'object' && 'pages' in input ? input : await this.getGallery(input);

    const { concurrency = 3, onProgress, signal } = options;
    const zip = new JSZip();
    const folderName = sanitizeFilename(gallery.title.pretty || gallery.title.english || `nhentai_${gallery.id}`);
    const folder = zip.folder(folderName) || zip;

    const pages = gallery.pages || [];
    const total = pages.length;
    let completedCount = 0;

    const pageTasks = pages.map((page) => {
      const pageNumber = page.number;
      const cleanPath = page.path.replace(/^\/+/, '');
      const ext = cleanPath.split('.').pop() || 'jpg';
      const filename = `${String(pageNumber).padStart(3, '0')}.${ext}`;
      const url = `${this.imageBaseUrl}/${cleanPath}`;

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
