import type { GeneratedFile } from "./types";

export interface ConfigItem {
  id: string;
  group: "stripe" | "supabase" | "posthog" | "other";
  label: string;
  explanation: string;
  linkLabel?: string;
  linkHref?: string;
  placeholderToken: string;
  /** Set only for a per-plan Stripe price ID, so the change request can name which plan to touch. */
  planName?: string;
}

const STRIPE_DASHBOARD_KEYS = "https://dashboard.stripe.com/apikeys";
const STRIPE_DASHBOARD_PRODUCTS = "https://dashboard.stripe.com/products";
const SUPABASE_DASHBOARD = "https://supabase.com/dashboard";
const POSTHOG_DASHBOARD = "https://app.posthog.com";

// Not exhaustive prettification (e.g. "Openai" instead of "OpenAI") -- this
// only runs for the generic catch-all tokens we don't have hand-written
// copy for, where an approximate plain-language label beats the raw
// SCREAMING_SNAKE_CASE constant name.
function prettifyToken(token: string): string {
  return token
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function combinedSource(files: GeneratedFile[]): string {
  return files.map((f) => f.content).join("\n");
}

interface PlanEntry {
  name: string;
  priceId: string;
}

// Finds a `PLANS = [...]` array and returns each entry's name/priceId pair.
// Uses a balanced-bracket scan rather than one regex over the whole array,
// since generated code formatting (nesting, line breaks, trailing commas)
// varies too much for a single regex to reliably capture the full literal.
function extractPlans(source: string): PlanEntry[] {
  const declMatch = source.match(/\bPLANS\s*=\s*\[/);
  if (!declMatch || declMatch.index == null) return [];
  const arrayStart = declMatch.index + declMatch[0].length - 1; // index of the opening [

  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) return [];
  const arrayBody = source.slice(arrayStart + 1, arrayEnd);

  const objectLiterals: string[] = [];
  let objDepth = 0;
  let objStart = -1;
  for (let i = 0; i < arrayBody.length; i++) {
    if (arrayBody[i] === "{") {
      if (objDepth === 0) objStart = i;
      objDepth++;
    } else if (arrayBody[i] === "}") {
      objDepth--;
      if (objDepth === 0 && objStart !== -1) {
        objectLiterals.push(arrayBody.slice(objStart, i + 1));
        objStart = -1;
      }
    }
  }

  const plans: PlanEntry[] = [];
  for (const obj of objectLiterals) {
    const nameMatch = obj.match(/\b(?:name|title|label)\s*:\s*["'`]([^"'`]+)["'`]/);
    const priceMatch = obj.match(/\b(?:priceId|price_id|stripePriceId)\s*:\s*["'`]([^"'`]*)["'`]/);
    if (nameMatch && priceMatch) {
      plans.push({ name: nameMatch[1], priceId: priceMatch[1] });
    }
  }
  return plans;
}

const PLACEHOLDER_PRICE_ID_PATTERN = /YOUR_|PLACEHOLDER|REPLACE_WITH|^STRIPE_PRICE_ID$/i;

function looksLikePlaceholderPriceId(value: string): boolean {
  if (!value.trim()) return true;
  if (PLACEHOLDER_PRICE_ID_PATTERN.test(value)) return true;
  // A real Stripe price ID is "price_" followed by a long alphanumeric id --
  // anything shorter, or not shaped like that at all, is very unlikely to
  // be a real one Claude could have generated on its own.
  return !/^price_[A-Za-z0-9]{10,}$/.test(value);
}

type KnownTokenDef = Omit<ConfigItem, "id" | "placeholderToken">;

const KNOWN_TOKENS: Record<string, KnownTokenDef> = {
  STRIPE_PUBLISHABLE_KEY: {
    group: "stripe",
    label: "Your Stripe publishable key",
    explanation:
      "Get this from stripe.com -- Developers -- API keys. Use pk_test_ for testing and pk_live_ for real payments.",
    linkLabel: "Go to Stripe API keys",
    linkHref: STRIPE_DASHBOARD_KEYS,
  },
  STRIPE_PRICE_ID: {
    group: "stripe",
    label: "Your Stripe price ID",
    explanation:
      "Create a product and price in your Stripe dashboard and paste the price ID here. It starts with price_.",
    linkLabel: "Go to Stripe Products",
    linkHref: STRIPE_DASHBOARD_PRODUCTS,
  },
  SUPABASE_URL: {
    group: "supabase",
    label: "Your Supabase project URL",
    explanation: "Find this on your Supabase project's Overview page.",
    linkLabel: "Go to Supabase dashboard",
    linkHref: SUPABASE_DASHBOARD,
  },
  NEXT_PUBLIC_SUPABASE_URL: {
    group: "supabase",
    label: "Your Supabase project URL",
    explanation: "Find this on your Supabase project's Overview page.",
    linkLabel: "Go to Supabase dashboard",
    linkHref: SUPABASE_DASHBOARD,
  },
  SUPABASE_ANON_KEY: {
    group: "supabase",
    label: "Your Supabase anon key",
    explanation:
      "Find this in your Supabase project under Settings -- API. Use the anon / public key, not the service_role key.",
    linkLabel: "Go to Supabase dashboard",
    linkHref: SUPABASE_DASHBOARD,
  },
  POSTHOG_KEY: {
    group: "posthog",
    label: "Your PostHog API key",
    explanation:
      "PostHog is free for up to 1 million events per month. Get your API key from app.posthog.com -- go to Settings -- Project API key.",
    linkLabel: "Go to PostHog",
    linkHref: POSTHOG_DASHBOARD,
  },
};

const GENERIC_PLACEHOLDER_PATTERNS = [/\bYOUR_[A-Z0-9_]+\b/g, /\bREPLACE_WITH_[A-Z0-9_]+\b/g, /\b[A-Z0-9_]+_PLACEHOLDER\b/g];

// Scans every generated file for values that look like they still need to be
// filled in before the app actually works -- a heuristic over the raw source
// text, not a real parser, so it favors precision (known tokens, and a
// structural check for PLANS entries) over trying to catch everything.
export function scanForConfigItems(files: GeneratedFile[]): ConfigItem[] {
  const source = combinedSource(files);
  const items: ConfigItem[] = [];
  const seenTokens = new Set<string>();

  for (const [token, def] of Object.entries(KNOWN_TOKENS)) {
    if (token === "STRIPE_PRICE_ID") continue; // handled via PLANS below, with a bare fallback afterward
    if (new RegExp(`\\b${token}\\b`).test(source)) {
      items.push({ id: token, placeholderToken: token, ...def });
      seenTokens.add(token);
    }
  }

  const plans = extractPlans(source);
  const placeholderPlans = plans.filter((plan) => looksLikePlaceholderPriceId(plan.priceId));
  for (const plan of placeholderPlans) {
    items.push({
      id: `STRIPE_PRICE_ID:${plan.name}`,
      group: "stripe",
      label: `Price ID for the "${plan.name}" plan`,
      explanation:
        "Create products and prices in your Stripe dashboard and paste the price IDs here. They start with price_.",
      linkLabel: "Go to Stripe Products",
      linkHref: STRIPE_DASHBOARD_PRODUCTS,
      placeholderToken: plan.priceId || "STRIPE_PRICE_ID",
      planName: plan.name,
    });
  }
  // A bare STRIPE_PRICE_ID token with no PLANS array at all (a single-plan
  // app that skipped the array) -- only when no plan-specific cards already
  // cover it, so a single plan doesn't get double-counted.
  if (placeholderPlans.length === 0 && /\bSTRIPE_PRICE_ID\b/.test(source)) {
    items.push({ id: "STRIPE_PRICE_ID", placeholderToken: "STRIPE_PRICE_ID", ...KNOWN_TOKENS.STRIPE_PRICE_ID });
  }

  for (const pattern of GENERIC_PLACEHOLDER_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const token = match[0];
      if (seenTokens.has(token) || token in KNOWN_TOKENS) continue;
      seenTokens.add(token);
      items.push({
        id: token,
        group: "other",
        label: prettifyToken(token),
        explanation:
          "This looks like a placeholder value in your generated code -- replace it with the real value before this feature will work.",
        placeholderToken: token,
      });
    }
  }

  return items;
}

// Builds the change-request text for replacing one placeholder. Plan-specific
// price IDs name the plan explicitly, since every plan in a PLANS array
// often shares the exact same placeholder text (e.g. "STRIPE_PRICE_ID")
// before it's filled in -- a plain find-and-replace across the whole file
// would set every plan to the same price.
export function buildReplacementRequest(item: ConfigItem, value: string): string {
  if (item.planName) {
    return `In the PLANS array, replace the placeholder price ID for the plan named "${item.planName}" (currently "${item.placeholderToken}") with "${value}". Do not change the price ID for any other plan, and do not change anything else.`;
  }
  return `Replace every occurrence of the placeholder "${item.placeholderToken}" in the code with "${value}". Do not change anything else.`;
}
