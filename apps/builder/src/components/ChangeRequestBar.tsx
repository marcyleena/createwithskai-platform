import { useState } from "react";
import { Button } from "@createwithskai/ui";

interface ChangeRequestBarProps {
  onSubmit: (request: string) => void;
  disabled?: boolean;
}

export function ChangeRequestBar({ onSubmit, disabled }: ChangeRequestBarProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-xl border border-taupe/40 bg-white p-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Describe a change -- e.g. 'add a dark mode toggle'"
        className="flex-1 rounded-full border border-taupe bg-white px-4 py-2 text-sm text-espresso placeholder:text-taupe focus:border-accent-pink focus:outline-none focus:ring-2 focus:ring-accent-pink/30 disabled:opacity-60"
      />
      <Button
        type="submit"
        variant="primary"
        disabled={disabled || !value.trim()}
        className="!bg-accent-pink px-4 py-2 !text-white hover:!bg-accent-pink/90"
      >
        {disabled ? "Updating..." : "Update"}
      </Button>
    </form>
  );
}
