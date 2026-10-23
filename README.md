# nhentai Downloader & nhentaijs SDK

A modular monorepo containing:
1. `nhentaijs`: A standalone TypeScript client and SDK for interacting with nHentai API v2 and v1 endpoints, supporting gallery metadata fetching and ZIP archiving.
2. `packages/client`: A mobile-responsive web client built with React, Vite, and Tailwind CSS that allows inputting a gallery URL or ID, previewing the cover image, and downloading the gallery as a ZIP file.

## Repository Structure

```text
nhentai-downloader/
├── packages/
│   ├── nhentaijs/          # Standalone SDK package
│   │   ├── src/
│   │   │   ├── client.ts   # NHentaiClient implementation
│   │   │   ├── types.ts    # TypeScript definitions
│   │   │   ├── utils.ts    # URL parser and helper routines
│   │   │   └── index.ts    # Public exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── client/             # Web application
│       ├── src/
│       │   ├── App.tsx     # Main downloader UI
│       │   └── main.tsx    # Entrypoint
│       ├── vite.config.ts  # Vite configuration with proxy
│       └── package.json
├── LICENSE                 # Apache 2.0 License
├── package.json            # Root workspace configuration
└── README.md
```

## nhentaijs SDK

The `nhentaijs` SDK is designed to be self-contained so you can copy `packages/nhentaijs` directly into any other project or use it locally via workspace references.

### Features
- Native support for API v2 endpoints (`/api/v2/galleries/{id}`) with fallback to API v1 (`/api/gallery/{id}`).
- Optional API key authentication (sent via `Authorization: Bearer <key>` and `X-API-Key`).
- Flexible input handling: accepts raw numeric ID (`177013`), full URL (`https://nhentai.net/g/177013/`), or gallery subpath.
- Configurable concurrency pool for downloading pages in parallel.
- Progress reporting hooks for live download and compression updates.
- In-memory ZIP packaging using JSZip (outputs typed `Uint8Array`).

### SDK Usage Example

```typescript
import { NHentaiClient } from 'nhentaijs';

const client = new NHentaiClient({
  apiKey: process.env.NHENTAI_API_KEY, // Optional
});

// 1. Fetch gallery metadata
const gallery = await client.getGallery('https://nhentai.net/g/177013/');
console.log('Title:', gallery.title.pretty);
console.log('Cover URL:', client.getCoverUrl(gallery));

// 2. Download all pages into a ZIP file
const { data, filename } = await client.downloadZip(gallery, {
  concurrency: 4,
  onProgress: (p) => {
    console.log(`[${p.stage}] ${p.current}/${p.total} (${p.percentage}%)`);
  },
});

// `data` is a Uint8Array containing the completed .zip file
```

### SDK Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `undefined` | Optional API token/key for authenticated endpoints |
| `baseUrl` | `string` | `https://nhentai.net` | Base URL for API requests |
| `imageBaseUrl` | `string` | `https://i.nhentai.net` | Base URL for full-size gallery page images |
| `thumbBaseUrl` | `string` | `https://t.nhentai.net` | Base URL for thumbnails and cover images |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch function or proxy wrapper |
| `userAgent` | `string` | `undefined` | Custom User-Agent header |
| `cookie` | `string` | `undefined` | Optional cookies for Cloudflare session clearance |

## Web Client (React + Vite)

A modern, responsive dark-themed web interface:
- Input gallery ID or full nHentai URL.
- Optional API Key input accordion.
- Cover-only preview card displaying title, page count, and tags.
- One-click ZIP download with real-time percentage progress bar.
- Fully responsive on mobile, tablet, and desktop viewports.

### Running the Client Locally

1. Install root dependencies:
   ```bash
   npm install
   ```

2. Build the SDK package:
   ```bash
   npm run build:sdk
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. Build for production:
   ```bash
   npm run build
   ```

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](file:///root/nhentai-downloader/LICENSE) file for details.
