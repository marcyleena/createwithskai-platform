import { useRef, useState } from "react";
import {
  ASSET_LABEL_OPTIONS,
  readFileAsDataUrl,
  sanitizeAssetFilename,
  validateAssetFile,
  type AssetLabelValue,
  type UploadedAsset,
} from "../lib/assets";

function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M12 16V4M12 4 7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface AssetUploaderProps {
  assets: UploadedAsset[];
  onAdd: (asset: UploadedAsset) => void;
  onRemove: (asset: UploadedAsset) => void;
  onLabelChange: (id: string, label: AssetLabelValue) => void;
  disabled?: boolean;
}

// Shared between the intake wizard's Assets step and the post-generation
// "App assets" panel -- same drag/drop zone, same per-card label dropdown,
// same thumbnail grid. The two callers differ only in what onAdd/onRemove do
// (intake just updates local answers; post-generation also fires a change
// request), not in how the upload UI itself looks or behaves.
export function AssetUploader({ assets, onAdd, onRemove, onLabelChange, disabled }: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || disabled) return;
    setError(null);
    // Tracked locally (not just read from the `assets` prop) so multiple
    // files dropped at once still get distinct filenames -- the prop won't
    // reflect earlier files in this same batch until a re-render happens.
    const taken = new Set(assets.map((a) => a.filename));
    for (const file of Array.from(fileList)) {
      const validationError = validateAssetFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      const filename = sanitizeAssetFilename(file.name, taken);
      taken.add(filename);
      const dataUrl = await readFileAsDataUrl(file);
      onAdd({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filename,
        label: "other",
        mimeType: file.type,
        dataUrl,
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-taupe/30 bg-cream/40 opacity-60"
            : "cursor-pointer border-taupe/40 bg-cream/60 hover:border-accent-pink/60"
        } ${dragActive ? "border-accent-pink bg-accent-pink/10" : ""}`}
      >
        <UploadIcon className="h-6 w-6 flex-none text-espresso/40" />
        <p className="text-sm font-medium text-espresso">Drag and drop images here, or click to browse</p>
        <p className="text-xs text-espresso/50">PNG, JPG, JPEG, SVG, or WebP -- up to 5MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {assets.map((asset) => (
            <div key={asset.id} className="flex flex-col gap-2 rounded-lg border border-taupe/30 bg-white p-2">
              <div className="flex h-20 items-center justify-center overflow-hidden rounded-md bg-cream">
                <img src={asset.dataUrl} alt={asset.filename} className="max-h-full max-w-full object-contain" />
              </div>
              <select
                value={asset.label}
                onChange={(e) => onLabelChange(asset.id, e.target.value as AssetLabelValue)}
                disabled={disabled}
                className="w-full rounded-md border border-taupe bg-white px-2 py-1 text-xs text-espresso focus:border-accent-pink focus:outline-none disabled:opacity-60"
              >
                {ASSET_LABEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="truncate text-[11px] text-espresso/50" title={asset.filename}>
                {asset.filename}
              </p>
              <button
                type="button"
                onClick={() => onRemove(asset)}
                disabled={disabled}
                className="text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
