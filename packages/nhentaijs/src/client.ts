import type { ClientOptions, DownloadOptions, DownloadProgress, Gallery } from './types';
import { parseGalleryId, sanitizeFilename } from './utils';
import JSZip from 'jszip';

export class NHentaiClient {
  private baseUrl: string;
  private imageServers: string[];
  private thumbServers: string[];
  private apiKey?: string;
  private fetchFn: typeof fetch;
  private userAgent: string;
  private cookie?: string;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://nhentai.net').replace(/\/+$/, '');
    this.imageServers = (options.imageServers && options.imageServers.length > 0)
      ? options.imageServers.map((s) => s.replace(/\/+$/, ''))
      : ['https://i1.nhentai.net', 'https://i3.nhentai.net', 'https://i4.nhentai.net'];
    this.thumbServers = (options.thumbServers && options.thumbServers.length > 0)
      ? options.thumbServers.map((s) => s.replace(/\/+$/, ''))
      : ['https://t1.nhentai.net', 'https://t3.nhentai.net', 'https://t4.nhentai.net'];
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetch || (typeof globalThis !== 'undefined' ? globalThis.fetch.bind(globalThis) : fetch);
    this.userAgent = options.userAgent || 'nhentaijs/1.0.0 (https://github.com/user/nhentaijs)';
    this.cookie = options.cookie;
  }

  /**
   * Builds headers complying with nHentai API v2 requirements.
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': this.userAgent,
    };

    if (this.apiKey) {
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
    const server = this.thumbServers[0] || 'https://t1.nhentai.net';
    return `${server}/${cleanPath}`;
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
    const serverIndex = (pageNumber - 1) % this.imageServers.length;
    const server = this.imageServers[serverIndex];
    return `${server}/${cleanPath}`;
  }

  /**
   * Downloads an individual image with retry, backoff, and server failover.
   */
  async downloadImage(
    cleanPath: string,
    pageNumber: number,
    options: { maxRetries?: number; signal?: AbortSignal } = {}
  ): Promise<ArrayBuffer> {
    const { maxRetries = 3, signal } = options;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) {
        throw new DOMException('Download aborted', 'AbortError');
      }

      // Rotate through healthy CDN servers on retry
      const serverIndex = (pageNumber - 1 + attempt) % this.imageServers.length;
      const server = this.imageServers[serverIndex];
      const url = `${server}/${cleanPath}`;

      try {
        const timeoutSignal = AbortSignal.timeout(12000);
        const combinedSignal = signal
          ? AbortSignal.any([signal, timeoutSignal])
          : timeoutSignal;

        const response = await this.fetchFn(url, {
          signal: combinedSignal,
          headers: {
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'User-Agent': this.userAgent,
            ...(this.cookie ? { Cookie: this.cookie } : {}),
          },
        });

        if (response.status === 429) {
          // Rate limited by CDN -> exponential backoff wait
          const delay = 1500 * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        return await response.arrayBuffer();
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries) {
          // Wait before retry
          const delay = 800 * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to download page ${pageNumber} after ${maxRetries} attempts: ${lastError?.message}`);
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

    const { concurrency = 2, delayMs = 150, maxRetries = 3, onProgress, signal } = options;
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

      return { pageNumber, filename, cleanPath };
    });

    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < pageTasks.length) {
        if (signal?.aborted) {
          throw new DOMException('Download aborted', 'AbortError');
        }

        const taskIndex = cursor++;
        const task = pageTasks[taskIndex];

        const buffer = await this.downloadImage(task.cleanPath, task.pageNumber, {
          maxRetries,
          signal,
        });

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

        // Small pacing delay to avoid burst rate limiting
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
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
