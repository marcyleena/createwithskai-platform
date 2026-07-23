import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@createwithskai/ui";
import type { ConnectionGuide } from "../lib/connectionGuides";
import { CheckBadge } from "./CheckBadge";

interface GuideCardProps {
  done: boolean;
  loading: boolean;
  guide: ConnectionGuide;
  children: ReactNode;
}

// Shared shell for every credential/connection card, in both the onboarding
// wizard and the dashboard's Profile & connections section, so the two
// surfaces always show the exact same guide content and behavior.
export function GuideCard({ done, loading, guide, children }: GuideCardProps) {
  const [expanded, setExpanded] = useState(false);
  const initialized = useRef(false);
  const prevDone = useRef(done);

  // Set the default expand state once, right when loading finishes, so a
  // not-yet-connected card starts open and an already-connected one starts
  // collapsed -- without a flash of the wrong state while still loading.
  useEffect(() => {
    if (loading || initialized.current) return;
    initialized.current = true;
    setExpanded(!done);
  }, [loading, done]);

  // Auto-collapse the moment a save/connect succeeds.
  useEffect(() => {
    if (!prevDone.current && done) setExpanded(false);
    prevDone.current = done;
  }, [done]);

  return (
    <div id={guide.id} className="rounded-xl border border-taupe/40 bg-white/60 p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div>
          <p className="font-medium text-espresso">{guide.title}</p>
          <p className="mt-0.5 text-sm text-espresso/60">{guide.subtitle}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          {!loading && done && <CheckBadge />}
          <span className={`text-espresso/50 transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 border-t border-taupe/20 pt-4">
          <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm text-espresso/80">
            {guide.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          {guide.extraLinks && (
            <div className="mb-3 flex flex-wrap gap-2">
              {guide.extraLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="!px-3 !py-1.5 !text-xs">
                    {link.label}
                  </Button>
                </a>
              ))}
            </div>
          )}

          {guide.note && <p className="mb-3 text-xs text-taupe">{guide.note}</p>}

          <div className="mb-4">
            <a href={guide.primaryLink.href} target="_blank" rel="noreferrer">
              <Button variant="outline" className="!px-3 !py-1.5 !text-sm">
                {guide.primaryLink.label}
              </Button>
            </a>
          </div>

          {children}
        </div>
      )}
    </div>
  );
}
