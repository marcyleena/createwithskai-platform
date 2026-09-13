import { useState } from "react";
import { Button } from "@createwithskai/ui";
import type { ConfigItem } from "../lib/placeholderScan";

const STRIPE_DOCS_LINK = "https://stripe.com/docs/payments/accept-a-payment";

const GROUP_LABELS: Record<ConfigItem["group"], string> = {
  stripe: "Stripe",
  supabase: "Supabase",
  posthog: "PostHog",
  other: "Other",
};

function ConfigItemCard({
  item,
  value,
  onChange,
  onApply,
  applying,
  disabled,
}: {
  item: ConfigItem;
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  applying: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-taupe/30 bg-cream/60 p-3">
      <p className="text-sm font-medium text-espresso">{item.label}</p>
      <p className="text-xs leading-relaxed text-espresso/60">{item.explanation}</p>
      {item.linkHref && (
        <a
          href={item.linkHref}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-accent-pink underline underline-offset-4"
        >
          {item.linkLabel}
        </a>
      )}
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste the value here"
          className="flex-1 rounded-lg border border-taupe bg-white px-3 py-2 text-sm text-espresso placeholder:text-taupe focus:border-accent-pink focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
        />
        <Button
          variant="dark"
          disabled={disabled || !value.trim()}
          onClick={onApply}
          className="flex-none !px-3 !py-2 !text-xs"
        >
          {applying ? "Applying…" : "Apply"}
        </Button>
      </div>
    </div>
  );
}

interface ConfigureServicesSectionProps {
  items: ConfigItem[];
  /** Id of the item whose change request is currently in flight, if any. */
  applyingId: string | null;
  /** True whenever any change request (from here or elsewhere) is in flight -- only one can run at a time. */
  disabled: boolean;
  onApply: (item: ConfigItem, value: string) => void;
}

// Shown only when the scan below actually finds something -- most apps have
// nothing to configure, and an empty "Configure your services" section would
// just be confusing.
export function ConfigureServicesSection({ items, applyingId, disabled, onApply }: ConfigureServicesSectionProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  if (items.length === 0) return null;

  const groups = (["stripe", "supabase", "posthog", "other"] as const)
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((g) => g.items.length > 0);

  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-espresso/60">Configure your services</h3>
      <p className="mb-3 text-xs text-espresso/60">
        Your app has placeholder values that need real ones before these features work. Fill in a value and click
        Apply to update your generated code.
      </p>
      <div className="flex flex-col gap-4">
        {groups.map(({ group, items: groupItems }) => (
          <div key={group} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-taupe">{GROUP_LABELS[group]}</span>
              {group === "stripe" && (
                <a
                  href={STRIPE_DOCS_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-accent-pink underline underline-offset-4"
                >
                  How to accept payments
                </a>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {groupItems.map((item) => (
                <ConfigItemCard
                  key={item.id}
                  item={item}
                  value={values[item.id] ?? ""}
                  onChange={(v) => setValues((prev) => ({ ...prev, [item.id]: v }))}
                  onApply={() => onApply(item, (values[item.id] ?? "").trim())}
                  applying={applyingId === item.id}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
