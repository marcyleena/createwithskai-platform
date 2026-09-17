import type { AssetLabelValue, UploadedAsset } from "../lib/assets";
import { AssetUploader } from "./AssetUploader";

interface AppAssetsSectionProps {
  assets: UploadedAsset[];
  onAdd: (asset: UploadedAsset) => void;
  onRemove: (asset: UploadedAsset) => void;
  onLabelChange: (id: string, label: AssetLabelValue) => void;
  /** True while a change request (this one's own, or anything else) is in flight -- only one can run at a time. */
  disabled: boolean;
}

// Reuses the exact same upload UI as the intake wizard's Assets step
// (AssetUploader) -- what differs here is what onAdd/onRemove actually do:
// each one fires a targeted change request (wired up in App.tsx) so the app
// picks up the new or removed asset, not just local state.
export function AppAssetsSection({ assets, onAdd, onRemove, onLabelChange, disabled }: AppAssetsSectionProps) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-espresso/60">App assets</h3>
      <p className="mb-3 text-xs text-espresso/60">
        Upload images to use in your app. Each asset will be added to your app and available for use in change
        requests.
      </p>
      <AssetUploader assets={assets} onAdd={onAdd} onRemove={onRemove} onLabelChange={onLabelChange} disabled={disabled} />
    </section>
  );
}
