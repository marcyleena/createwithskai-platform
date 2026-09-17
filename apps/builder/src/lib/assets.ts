export type AssetLabelValue = "logo" | "favicon" | "hero" | "screenshot" | "background" | "icon" | "other";

export interface AssetLabelOption {
  value: AssetLabelValue;
  label: string;
  description: string;
}

export const ASSET_LABEL_OPTIONS: AssetLabelOption[] = [
  { value: "logo", label: "Logo", description: "appears in the header and branding areas" },
  { value: "favicon", label: "Favicon", description: "appears in the browser tab" },
  { value: "hero", label: "Hero image", description: "appears as a prominent background or banner" },
  { value: "screenshot", label: "Product screenshot", description: "used to illustrate features" },
  { value: "background", label: "Background", description: "used as a page or section background" },
  { value: "icon", label: "Icon", description: "used as a UI icon or illustration" },
  { value: "other", label: "Other", description: "general purpose image" },
];

export interface UploadedAsset {
  id: string;
  /** Web-safe, unique within the current asset set -- committed to public/<filename> and referenced as /<filename> in generated code. */
  filename: string;
  label: AssetLabelValue;
  mimeType: string;
  /** data:<mime>;base64,<...> -- both the preview and the actual image data live in this one string. */
  dataUrl: string;
}

const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateAssetFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return `${file.name}: unsupported file type. Use PNG, JPG, JPEG, SVG, or WebP.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${file.name}: file is too large. Maximum size is 5MB.`;
  }
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

// Keeps filenames web-safe and unique within the current asset set --
// generated code references these literally (e.g. src="/logo.png"), so a
// collision would silently overwrite one asset's public/ file with another's
// at deploy time.
export function sanitizeAssetFilename(originalName: string, taken: Set<string>): string {
  const lastDot = originalName.lastIndexOf(".");
  const rawBase = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const ext = (lastDot > 0 ? originalName.slice(lastDot + 1) : "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const base = rawBase.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "asset";

  let candidate = `${base}.${ext}`;
  let counter = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${counter}.${ext}`;
    counter++;
  }
  return candidate;
}

export function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}

export function guessMimeTypeFromFilename(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    case "ico":
      return "image/x-icon";
    default:
      return null;
  }
}

function labelDisplayText(label: AssetLabelValue): string {
  return ASSET_LABEL_OPTIONS.find((o) => o.value === label)?.label ?? "Other";
}

// Included in buildGenerationPrompt (systemPrompts.ts) when the intake has
// any assets -- exact wording as specified, since it's what tells Claude
// these files will actually exist at deploy time and how to reference them.
export function buildAssetsPromptBlock(assets: UploadedAsset[]): string {
  if (assets.length === 0) return "";
  const listing = assets.map((asset) => `- ${asset.filename} (${labelDisplayText(asset.label)})`).join("\n");
  return `The following assets have been uploaded and will be committed to the public/ directory of the generated app. Reference them by their filename in your generated code exactly as listed:
${listing}
For example if a logo.png is provided use it in the header as <img src='/logo.png' alt='Logo' />. If a favicon.png is provided add <link rel='icon' href='/favicon.png' /> in the HTML head. Use every provided asset in an appropriate location in the app.`;
}

// The two change-request templates used post-generation (ConfigureServicesSection
// area's Assets section / App.tsx) -- one per asset upload, one per removal.
export function buildAssetChangeRequest(asset: UploadedAsset): string {
  return `An asset has been uploaded to public/${asset.filename}. It is a ${labelDisplayText(asset.label).toLowerCase()}. Please update the app to use this asset in the most appropriate location -- for a logo update the header, for a favicon update the HTML head link tag, for a hero image add it to the main landing area.`;
}

export function buildAssetRemovalRequest(asset: UploadedAsset): string {
  return `The asset at public/${asset.filename} has been removed. Please remove any references to it from the app (image tags, CSS backgrounds, or link tags pointing to /${asset.filename}).`;
}
