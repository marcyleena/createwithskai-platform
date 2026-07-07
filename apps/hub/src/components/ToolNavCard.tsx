import type { ReactNode } from "react";
import { Card, Button } from "@createwithskai/ui";

interface ToolNavCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}

export function ToolNavCard({ icon, title, description, cta }: ToolNavCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-pink/15 text-accent-pink">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-espresso">{title}</h3>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-espresso/70">{description}</p>
      {cta && (
        <a href={cta.href} className="self-start">
          <Button variant="dark">{cta.label}</Button>
        </a>
      )}
    </Card>
  );
}
