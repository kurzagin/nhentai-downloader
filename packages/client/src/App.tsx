import React, { useState } from 'react';
import { NHentaiClient, Gallery, DownloadProgress } from 'nhentaijs';
import { Download, Search, Key, AlertCircle, CheckCircle2, Loader2, BookOpen, Layers } from 'lucide-react';

export default function App() {
  const [inputVal, setInputVal] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  // Instantiates client using relative endpoints for Vite proxy or direct paths
  const getClient = () => {
    return new NHentaiClient({
      apiKey: apiKey.trim() || undefined,
      baseUrl: window.location.origin,
      imageBaseUrl: `${window.location.origin}/galleries`,
      thumbBaseUrl: `${window.location.origin}/thumb-galleries`,
    });
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    setError(null);
    setLoading(true);
    setGallery(null);
    setProgress(null);

    try {
      const client = getClient();
      const data = await client.getGallery(inputVal.trim());
      setGallery(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!gallery) return;

    setDownloading(true);
    setError(null);
    try {
      const client = getClient();
      const { data, filename } = await client.downloadZip(gallery, {
        concurrency: 4,
        onProgress: (p) => setProgress(p),
      });

      // Trigger browser file download
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message || 'Failed to download zip');
    } finally {
      setDownloading(false);
    }
  };

  const client = getClient();
  const coverUrl = gallery ? client.getCoverUrl(gallery) : null;

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#efeff1] flex flex-col items-center px-4 py-8 md:py-14">
      {/* Container */}
      <main className="w-full max-w-xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span className="text-[#ed2553]">nhentai</span> Downloader
          </h1>
          <p className="text-sm text-gray-400">
            Fetch gallery metadata, preview cover, and download as a ZIP archive.
          </p>
        </header>

        {/* Input Form Card */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-lg space-y-4">
          <form onSubmit={handleFetch} className="space-y-4">
            <div>
              <label htmlFor="gallery-input" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Gallery URL or ID
              </label>
              <div className="relative">
                <input
                  id="gallery-input"
                  type="text"
                  placeholder="e.g. 177013 or https://nhentai.net/g/177013/"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="w-full bg-[#27272a] border border-[#3f3f46] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ed2553] transition"
                  disabled={loading || downloading}
                />
              </div>
            </div>

            {/* Optional API Key Toggle */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1.5 transition select-none"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{showApiKey ? 'Hide' : 'Add'} API Key (Optional)</span>
              </button>

              {showApiKey && (
                <div className="animate-fadeIn">
                  <input
                    type="password"
                    placeholder="Enter API Key / Token"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#27272a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ed2553] transition"
                    disabled={loading || downloading}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Sent as Bearer token and X-API-Key header with API v2 requests.
                  </p>
                </div>
              )}
            </div>

            {/* Fetch Button */}
            <button
              type="submit"
              disabled={loading || downloading || !inputVal.trim()}
              className="w-full bg-[#ed2553] hover:bg-[#d91d47] active:bg-[#c4153c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching Details...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Load Gallery</span>
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/60 rounded-lg p-3 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Gallery Preview Card (Cover Only) */}
        {gallery && (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-lg space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              {/* Cover Only Preview */}
              <div className="relative group w-48 sm:w-44 flex-shrink-0 rounded-lg overflow-hidden border border-[#27272a] shadow-md bg-[#27272a]">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={gallery.title.pretty || 'Cover'}
                    className="w-full h-auto object-cover block"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500 text-xs">
                    No cover preview
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/75 px-2 py-0.5 rounded text-[10px] font-semibold text-white">
                  Cover
                </div>
              </div>

              {/* Gallery Info */}
              <div className="flex-1 space-y-3 text-center sm:text-left min-w-0 w-full">
                <div>
                  <h2 className="text-base font-bold text-white line-clamp-2 leading-snug">
                    {gallery.title.pretty || gallery.title.english}
                  </h2>
                  {gallery.title.japanese && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                      {gallery.title.japanese}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#27272a] p-2.5 rounded-lg flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#ed2553]" />
                    <span className="text-gray-300 font-medium">{gallery.num_pages} Pages</span>
                  </div>
                  <div className="bg-[#27272a] p-2.5 rounded-lg flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 font-medium">ID #{gallery.id}</span>
                  </div>
                </div>

                {/* Tags preview */}
                {gallery.tags && gallery.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                    {gallery.tags.slice(0, 10).map((tag) => (
                      <span
                        key={tag.id}
                        className="bg-[#27272a] text-gray-300 text-[11px] px-2 py-0.5 rounded-full border border-[#3f3f46]"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {gallery.tags.length > 10 && (
                      <span className="text-gray-500 text-[11px] self-center">
                        +{gallery.tags.length - 10} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Download Progress Bar */}
            {progress && (
              <div className="bg-[#27272a] p-3.5 rounded-lg space-y-2">
                <div className="flex justify-between text-xs text-gray-300">
                  <span className="capitalize">{progress.stage}...</span>
                  <span>
                    {progress.stage === 'downloading'
                      ? `${progress.current} / ${progress.total} pages (${progress.percentage}%)`
                      : `${progress.percentage}%`}
                  </span>
                </div>
                <div className="w-full bg-[#18181b] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#ed2553] h-full transition-all duration-200"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Download Action Button */}
            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading & Packing ZIP...</span>
                </>
              ) : progress?.stage === 'done' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Download Again</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download ZIP</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-8 text-xs text-gray-500 text-center">
        Powered by nhentaijs SDK &middot; Apache 2.0 License
      </footer>
    </div>
  );
}
