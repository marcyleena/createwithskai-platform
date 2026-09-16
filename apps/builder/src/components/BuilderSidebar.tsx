import type { AppBuild } from "@createwithskai/types";
import { Button } from "@createwithskai/ui";
import { STACK_LABELS } from "../lib/stackDetection";
import type { BuildConfig, Stack } from "../lib/types";

interface BuilderSidebarProps {
  builds: AppBuild[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

// "deployed" (deployed once) and "updated" (deployed, then redeployed after
// further changes) are both real, distinct statuses in the DB -- see
// AppBuild in packages/types and app_builds_status_check in
// supabase/schema.sql -- but read as "Deployed" / "Updated" here rather than
// their raw storage values.
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  deployed: "Deployed",
  updated: "Updated",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-taupe/20 text-espresso/70",
  deployed: "bg-green-100 text-green-700",
  updated: "bg-accent-pink/15 text-accent-pink",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BuilderSidebar({
  builds,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onClose,
  hasMore,
  loadingMore,
  onLoadMore,
}: BuilderSidebarProps) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-espresso/40 sm:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-none flex-col border-r border-taupe/30 bg-cream transition-transform sm:static sm:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-taupe/30 p-4">
          <Button variant="dark" onClick={onNew} className="!bg-espresso !text-white w-full justify-center">
            New build
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {builds.length === 0 && (
            <p className="p-3 text-sm text-espresso/50">Your builds will show up here.</p>
          )}
          {builds.map((build) => {
            const config = build.config as unknown as BuildConfig | undefined;
            // Driven by the status column, not config?.deploymentUrl alone --
            // status is a single reliable field, where the config-derived
            // check silently hid this button entirely if a deploy's Supabase
            // write ever failed partway (see updateBuild in useBuilds.ts).
            const isDeployed = build.status === "deployed" || build.status === "updated";
            return (
              <div
                key={build.id}
                className={`group mb-1 rounded-lg px-3 py-2 text-sm ${
                  build.id === activeId ? "bg-accent-pink/15" : "hover:bg-white"
                }`}
              >
                <button type="button" onClick={() => onSelect(build.id)} className="block w-full text-left">
                  <span className="block truncate font-medium text-espresso">{build.name}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        STATUS_STYLES[build.status] ?? STATUS_STYLES.draft
                      }`}
                    >
                      {STATUS_LABELS[build.status] ?? build.status.replace("_", " ")}
                    </span>
                    <span className="text-[11px] text-espresso/50">
                      {STACK_LABELS[build.platform as Stack] ?? build.platform}
                    </span>
                  </span>
                  {build.status === "updated" && (
                    <span className="mt-0.5 block text-[10px] text-espresso/40">
                      Updated {formatTimestamp(build.updated_at)}
                    </span>
                  )}
                </button>

                {isDeployed && (
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    {config?.deploymentUrl ? (
                      <a
                        href={config.deploymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-[11px] text-accent-pink underline underline-offset-2 hover:text-accent-pink/80"
                      >
                        {config.deploymentUrl}
                      </a>
                    ) : (
                      <span className="truncate text-[11px] text-espresso/40">Deployment link unavailable</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(build.id);
                      }}
                      className="flex-none rounded-full border border-accent-pink/40 px-2 py-0.5 text-[10px] font-semibold text-accent-pink hover:bg-accent-pink/10"
                    >
                      Continue editing
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onDelete(build.id)}
                  className="mt-1 text-[11px] text-espresso/40 opacity-0 hover:text-red-600 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            );
          })}
          {hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full rounded-lg p-2 text-center text-sm font-medium text-espresso/60 hover:bg-white disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
