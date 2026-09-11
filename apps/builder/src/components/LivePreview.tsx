import { useEffect, useState } from "react";
import { buildPreviewDocument } from "../lib/previewBuilder";
import { findFile } from "../lib/fileLookup";
import type { GeneratedFile, Stack } from "../lib/types";

interface LivePreviewProps {
  files: GeneratedFile[];
  stack: Stack;
}

// If a generation response got cut off (or a race lands `files` between
// steps) and the CSS file genuinely never arrives, this caps how long the
// "Finishing styles..." message shows before we give up waiting and render
// whatever we have -- an unstyled preview beats a permanently stuck one.
const STYLES_WAIT_TIMEOUT_MS = 1500;

export function LivePreview({ files, stack }: LivePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [waitingForStyles, setWaitingForStyles] = useState(false);

  // React apps get their theme from a separate src/index.css file (see
  // systemPrompts.ts); static-html apps embed <style> inline in the one file
  // they produce, so there's no separate file to wait for.
  const missingCss = stack !== "static-html" && files.length > 0 && !findFile(files, "index.css");

  useEffect(() => {
    if (missingCss) {
      // Don't render the unstyled version immediately -- give the rest of
      // the generation output a moment to finish arriving/parsing before
      // falling back to rendering with whatever files are actually present.
      setWaitingForStyles(true);
      const timeout = setTimeout(() => {
        setWaitingForStyles(false);
        const doc = buildPreviewDocument(files, stack);
        const blob = new Blob([doc], { type: "text/html" });
        setBlobUrl(URL.createObjectURL(blob));
      }, STYLES_WAIT_TIMEOUT_MS);
      return () => clearTimeout(timeout);
    }

    setWaitingForStyles(false);
    const doc = buildPreviewDocument(files, stack);
    const blob = new Blob([doc], { type: "text/html" });
    setBlobUrl(URL.createObjectURL(blob));
  }, [files, stack, missingCss]);

  // Runs right before the next blobUrl is set (or on unmount), by which
  // point the iframe has already re-rendered with the new URL -- so the old
  // one can be safely released without a flash of broken content.
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-taupe/40 bg-white">
      <div className="flex flex-none items-center gap-1.5 border-b border-taupe/30 bg-cream px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-taupe/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-taupe/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-taupe/60" />
        <span className="ml-2 text-xs font-medium text-espresso/60">Live preview</span>
      </div>
      <div className="flex-none space-y-0.5 border-b border-taupe/20 bg-pink/10 px-3 py-1.5 text-center text-xs text-taupe">
        <p>Preview mode -- data resets on refresh. Your deployed app will save data normally.</p>
        <p>
          Preview tip: if you see a login screen, the app has authentication enabled. Use any email
          and password to create a test account.
        </p>
      </div>
      {waitingForStyles ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-espresso/50">
          <span className="h-3.5 w-3.5 flex-none animate-spin rounded-full border-2 border-taupe/40 border-t-accent-pink" />
          Finishing styles...
        </div>
      ) : blobUrl ? (
        <iframe
          key={blobUrl}
          src={blobUrl}
          title="App preview"
          sandbox="allow-scripts allow-forms allow-modals allow-popups"
          className="min-h-[420px] w-full flex-1 bg-white"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-espresso/50">
          Loading preview...
        </div>
      )}
    </div>
  );
}
