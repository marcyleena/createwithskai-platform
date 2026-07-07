import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-taupe/30 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-base font-semibold text-espresso sm:text-lg">
          The AI Influencer Launchpad{" "}
          <span className="hidden text-espresso/50 sm:inline">by Skai Monroe</span>
        </Link>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}
