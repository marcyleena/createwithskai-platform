import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "dark";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent-pink text-cream hover:bg-pink hover:text-espresso",
  secondary: "bg-taupe text-espresso hover:bg-cream",
  outline: "bg-transparent border border-espresso text-espresso hover:bg-cream",
  dark: "bg-espresso text-white hover:bg-accent-pink",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full px-5 py-2.5 font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
