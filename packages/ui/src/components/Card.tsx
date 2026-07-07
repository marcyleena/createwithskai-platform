import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-taupe/40 bg-cream p-6 shadow-sm ${className}`}
      {...props}
    />
  );
}
