import { useState } from "react";
import { QUICK_PROMPTS } from "../lib/quickPrompts";

interface SuggestionsPanelProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestionsPanel({ onSelect, disabled }: SuggestionsPanelProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(prompt: string) {
    setOpen(false);
    onSelect(prompt);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-accent-pink px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-pink/90"
      >
        <SparkleIcon className="h-3.5 w-3.5" />
        Suggestions
        <ChevronIcon className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${
          open ? "max-h-96 pb-3 pt-2 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-taupe/30 bg-cream p-3 sm:grid-cols-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(prompt)}
              className="rounded-lg border border-taupe/40 bg-white px-3 py-2 text-left text-sm font-medium text-espresso transition-colors hover:border-accent-pink hover:bg-accent-pink/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.5 13.8 8.6 20 10.4l-6.2 1.8L12 18.3l-1.8-6.1L4 10.4l6.2-1.8L12 2.5Z" />
      <path d="M19 15.5 19.8 18l2.4.8-2.4.8-.8 2.4-.8-2.4L15.8 18l2.4-.8.8-2.5Z" />
    </svg>
  );
}

function ChevronIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} {...props}>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
