const QUICK_PROMPTS = [
  "Find my content path",
  "Build my Brand Bible",
  "Write me a script",
  "Build a shot list",
  "Generate hooks",
  "What should I post this week",
];

interface QuickPromptsProps {
  onSelect: (prompt: string) => void;
}

export function QuickPrompts({ onSelect }: QuickPromptsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {QUICK_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          className="rounded-xl border border-taupe/40 bg-white px-4 py-3 text-left text-sm font-medium text-espresso transition-colors hover:border-accent-pink hover:bg-accent-pink/10"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
