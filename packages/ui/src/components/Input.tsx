import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-taupe bg-white px-4 py-2.5 text-espresso placeholder:text-taupe focus:border-accent-pink focus:outline-none focus:ring-2 focus:ring-accent-pink/30 ${className}`}
      {...props}
    />
  );
}
