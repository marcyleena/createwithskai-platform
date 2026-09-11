import { useEffect, useState } from "react";
import { buildPreviewDocument } from "../lib/previewBuilder";
import type { GeneratedFile, Stack } from "../lib/types";

interface LivePreviewProps {
  files: GeneratedFile[];
  stack: Stack;
}

export function LivePreview({ files, stack }: LivePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const doc = buildPreviewDocument(files, stack);
    const blob = new Blob([doc], { type: "text/html" });
    setBlobUrl(URL.createObjectURL(blob));
  }, [files, stack]);

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
      {blobUrl ? (
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
