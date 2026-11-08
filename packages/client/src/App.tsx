import React, { useState } from 'react';
import { NHentaiClient, parseGalleryId } from '@krpkg/nhentaijs';
import type { Gallery, DownloadProgress } from '@krpkg/nhentaijs';
import {
  Button,
  BracketCard,
  CornerFrame,
  Badge,
  Dot,
  TechLabel,
  Input,
  TelemetryBar,
  KeyValGrid,
  HudToast,
  TerminalWindow,
  CyberSwitch,
  type DataSpecItem,
} from '@krpkg/ui';
import {
  Download,
  Search,
  Key,
  AlertCircle,
  Code2,
  Star,
  Github,
} from 'lucide-react';

export default function App() {
  const [inputVal, setInputVal] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Instantiates client using Vite dev server proxy endpoints
  const getClient = () => {
    return new NHentaiClient({
      apiKey: apiKey.trim() || undefined,
      baseUrl: window.location.origin,
      imageServers: [
        `${window.location.origin}/image-cdn-1`,
        `${window.location.origin}/image-cdn-3`,
        `${window.location.origin}/image-cdn-4`,
      ],
      thumbServers: [`${window.location.origin}/thumb-cdn`],
    });
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    setError(null);
    setLoading(true);
    setGallery(null);
    setProgress(null);
    setShowRawJson(false);

    try {
      const parsedId = parseGalleryId(inputVal.trim());
      const client = getClient();
      const data = await client.getGallery(parsedId);
      setGallery(data);
      setToastMessage(`Loaded gallery #${data.id}`);
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
        concurrency: 2,
        delayMs: 150,
        maxRetries: 3,
        onProgress: (p: DownloadProgress) => setProgress(p),
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
      setToastMessage(`Archive ${filename} downloaded successfully!`);
    } catch (err) {
      setError((err as Error).message || 'Failed to download zip');
    } finally {
      setDownloading(false);
    }
  };

  const client = getClient();
  const coverUrl = gallery ? client.getCoverUrl(gallery) : null;

  const metadataSpecs: DataSpecItem[] = gallery
    ? [
        { key: 'ID', value: `#${gallery.id}`, status: 'purple' },
        { key: 'MEDIA ID', value: gallery.media_id, status: 'default' },
        { key: 'PAGES', value: `${gallery.num_pages} pages`, status: 'success' },
        {
          key: 'FAVORITES',
          value: gallery.num_favorites !== undefined ? gallery.num_favorites.toLocaleString() : 'N/A',
          status: 'default',
        },
        {
          key: 'UPLOAD DATE',
          value: gallery.upload_date ? new Date(gallery.upload_date * 1000).toLocaleDateString() : 'N/A',
          status: 'default',
        },
        { key: 'SCANLATOR', value: gallery.scanlator || 'None', status: 'default' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[var(--kz-bg-0)] text-[var(--kz-text-0)] flex flex-col items-center px-4 py-8 md:py-14 font-mono selection:bg-[#ed2553] selection:text-white">
      {/* Toast notification */}
      {toastMessage && (
        <HudToast
          isOpen={!!toastMessage}
          onClose={() => setToastMessage(null)}
          title="NHENTAI SYSTEM"
          description={toastMessage}
          variant="teal"
          duration={4000}
        />
      )}

      {/* Main Container */}
      <main className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header Section */}
        <header className="space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--kz-border)] pb-3">
            <TechLabel label="NH-DL" jp="ダウンロード" />
            <div className="flex items-center gap-2">
              <Dot color={gallery ? 'green' : 'accent'} pulse={loading || downloading} />
              {(downloading || loading || gallery) && (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {downloading ? 'STREAMING' : loading ? 'QUERYING' : 'SYNCED'}
                </Badge>
              )}
            </div>
          </div>

          <div className="pt-2 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
              <span className="text-[#ed2553] font-black">NHENTAI</span>
              <span className="text-[var(--kz-text-1)] font-light">DOWNLOADER</span>
            </h1>
            <p className="text-xs text-[var(--kz-text-2)] mt-1">
              Fetch gallery metadata, preview cover, and download as a ZIP archive.
            </p>
          </div>
        </header>

        {/* Input Form BracketCard */}
        <BracketCard active={!gallery} className="p-5 space-y-4">
          <form onSubmit={handleFetch} className="space-y-4">
            <div>
              <Input
                label="GALLERY IDENTIFIER / URL"
                sublabel="ENTER ID OR FULL URL"
                prefixSymbol={<Search className="w-4 h-4 text-[var(--kz-text-2)]" />}
                placeholder="e.g. 521265 or https://nhentai.net/g/521265/"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={loading || downloading}
                fullWidth
              />
            </div>

            {/* API Key Toggle via CyberSwitch */}
            <div className="pt-1 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <CyberSwitch
                  checked={showApiKey}
                  onChange={setShowApiKey}
                  size="sm"
                  variant="default"
                  label={
                    <span className="flex items-center gap-1.5 text-xs text-[var(--kz-text-1)]">
                      <Key className="w-3.5 h-3.5 text-[var(--kz-accent)]" />
                      CUSTOM API KEY
                    </span>
                  }
                  sublabel="Elevate rate-limits via credentials"
                />
              </div>

              {showApiKey && (
                <div className="animate-fadeIn mt-2">
                  <Input
                    type="password"
                    label="API KEY TOKEN"
                    placeholder="Enter Authorization token"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={loading || downloading}
                    fullWidth
                    inputSize="sm"
                  />
                </div>
              )}
            </div>

            {/* Fetch Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || downloading || !inputVal.trim()}
              className="w-full justify-center tracking-wider text-xs uppercase"
            >
              {loading ? 'EXECUTING QUERY...' : 'ACQUIRE METADATA'}
            </Button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/60 rounded-sm p-3 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <div className="space-y-1">
                <span className="font-semibold block tracking-wider uppercase text-[10px] text-red-400">
                  SYSTEM ERROR
                </span>
                <span className="block leading-relaxed">{error}</span>
              </div>
            </div>
          )}
        </BracketCard>

        {/* Gallery Preview BracketCard */}
        {gallery && (
          <BracketCard active={true} className="p-5 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[var(--kz-border)] pb-2.5">
              <TechLabel label="PAYLOAD MANIFEST" jp="書誌仕様" coord={`ID-${gallery.id}`} />
              <Badge variant="teal">{gallery.num_pages} PAGES</Badge>
            </div>

            {/* Cover and Primary Details */}
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <CornerFrame showCorners className="w-44 flex-shrink-0 overflow-hidden bg-[var(--kz-bg-2)] border border-[var(--kz-border)] shadow-xl">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={gallery.title.pretty || 'Cover'}
                    className="w-full h-auto object-cover block"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-60 flex items-center justify-center text-[var(--kz-text-2)] text-xs">
                    NO PREVIEW
                  </div>
                )}
              </CornerFrame>

              <div className="flex-1 space-y-4 min-w-0 w-full">
                <div>
                  <h2 className="text-base font-bold text-white line-clamp-2 leading-snug">
                    {gallery.title.pretty || gallery.title.english}
                  </h2>
                  {gallery.title.japanese && (
                    <p className="text-xs text-[var(--kz-text-1)] mt-1 font-sans line-clamp-1">
                      {gallery.title.japanese}
                    </p>
                  )}
                </div>

                {/* KeyValGrid for technical specs */}
                <KeyValGrid
                  items={metadataSpecs}
                  coord="SPEC-METRIC"
                  columns={2}
                  leaderDots
                  className="bg-[var(--kz-bg-1)] p-3 border border-[var(--kz-border)] rounded-sm"
                />

                {/* Tags Section */}
                {gallery.tags && gallery.tags.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--kz-text-2)] block">
                      TAXONOMY TAGS:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {gallery.tags.slice(0, 14).map((tag) => (
                        <Badge key={tag.id} variant="outline" className="text-[10px] lowercase">
                          #{tag.name}
                        </Badge>
                      ))}
                      {gallery.tags.length > 14 && (
                        <Badge variant="default" className="text-[10px]">
                          +{gallery.tags.length - 14} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Telemetry Bar for Download progress */}
            {progress && (
              <div className="space-y-2 bg-[var(--kz-bg-1)] p-3.5 border border-[var(--kz-border)] rounded-sm">
                <div className="flex items-center justify-between text-xs text-[var(--kz-text-1)] mb-1">
                  <span className="uppercase tracking-wider">
                    STREAM STATUS: {progress.stage}
                  </span>
                  <span>
                    {progress.stage === 'downloading'
                      ? `${progress.current} / ${progress.total} PG (${progress.percentage}%)`
                      : `${progress.percentage}%`}
                  </span>
                </div>
                <TelemetryBar
                  value={progress.percentage}
                  max={100}
                  variant={progress.stage === 'done' ? 'success' : 'accent'}
                  size="md"
                  segmented
                  segmentsCount={20}
                  showReadout={false}
                />
              </div>
            )}

            {/* Download Action Button */}
            <div className="pt-2">
              <Button
                variant={progress?.stage === 'done' ? 'ghost' : 'primary'}
                size="lg"
                onClick={handleDownloadZip}
                disabled={downloading}
                className="w-full justify-center gap-2 uppercase tracking-widest text-xs font-semibold"
              >
                {downloading ? (
                  <>
                    <Dot color="accent" pulse />
                    <span>PACKING ARCHIVE STREAM...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{progress?.stage === 'done' ? 'RE-EXTRACT ZIP ARCHIVE' : 'EXTRACT AS ZIP ARCHIVE'}</span>
                  </>
                )}
              </Button>
            </div>

            {/* Raw JSON Debug Viewer using TerminalWindow */}
            <div className="border-t border-[var(--kz-border)] pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--kz-text-2)] uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" />
                  RAW SYSTEM PAYLOAD
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-[11px] h-7 px-2"
                >
                  {showRawJson ? 'HIDE RAW' : 'VIEW RAW'}
                </Button>
              </div>

              {showRawJson && (
                <TerminalWindow
                  title={`payload-gallery-${gallery.id}.json`}
                  badge="JSON"
                  code={JSON.stringify(gallery, null, 2)}
                  showLineNumbers
                  copyable
                  className="mt-2 text-xs"
                />
              )}
            </div>
          </BracketCard>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-10 pb-6 text-xs text-[var(--kz-text-2)] text-center tracking-wider flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span>
            Made by{' '}
            <a
              href="https://github.com/kurzagin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--kz-text-0)] hover:text-[#ed2553] font-medium transition-colors underline-offset-4 hover:underline"
            >
              kurzagin
            </a>
          </span>
          <span className="text-[var(--kz-border)]">&middot;</span>
          <a
            href="https://github.com/kurzagin/nhentai-downloader"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--kz-bg-1)] border border-[var(--kz-border)] text-[var(--kz-text-1)] hover:text-white hover:border-[#ed2553] transition-all text-[11px] group"
          >
            <Github className="w-3.5 h-3.5 text-[var(--kz-text-2)] group-hover:text-white transition-colors" />
            <span>Star on GitHub</span>
            <Star className="w-3 h-3 text-[var(--kz-accent)] fill-[var(--kz-accent)] group-hover:scale-110 transition-transform" />
          </a>
        </div>
      </footer>
    </div>
  );
}
