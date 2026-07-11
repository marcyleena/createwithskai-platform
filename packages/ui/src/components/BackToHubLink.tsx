import type { AnchorHTMLAttributes, SVGProps } from "react";

function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M4 10.5 12 4l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type BackToHubLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

// A subtle, consistent way back to the hub from every tool -- deliberately
// quiet (taupe, not espresso/accent-pink) so it doesn't compete with each
// tool's own header, but present as a fixed top-left anchor on every page.
export function BackToHubLink({ className = "", ...props }: BackToHubLinkProps) {
  return (
    <a
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-taupe transition-colors hover:text-accent-pink ${className}`}
      {...props}
    >
      <HomeIcon className="h-4 w-4 flex-none" />
      <span className="hidden sm:inline">Back to Hub</span>
    </a>
  );
}
