import { useState } from "react";
import { Button } from "@createwithskai/ui";
import type { DeployResult } from "../lib/deployClient";
import type { IntakeAnswers } from "../lib/types";

function ChecklistIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" strokeLinejoin="round" />
      <path d="m8 8 1.5 1.5L12 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8h4" strokeLinecap="round" />
      <path d="m8 13 1.5 1.5L12 12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 13h4" strokeLinecap="round" />
      <path d="M8 18h10" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CHECKLIST_ITEMS = [
  "Give your app a name -- the Builder will use it as your repository and URL name",
  "Test every feature in the preview above",
  "Request any changes before deploying -- it is easier to fix now than after",
  "If your app collects any user data, it needs a privacy policy -- ask Skai AI Coach to write one for you",
  "If your app uses AI, disclose it to users -- required for EU visitors as of August 2025",
  "Review your app on mobile -- resize the preview window to check responsiveness",
];

interface FeatureSuggestion {
  title: string;
  description: string;
}

const DEFAULT_SUGGESTIONS: FeatureSuggestion[] = [
  {
    title: "User authentication",
    description: "Let users create accounts and save their data across devices",
  },
  {
    title: "Email notifications",
    description: "Notify users of activity or send them updates",
  },
  {
    title: "Payment integration",
    description: "Accept payments using Stripe for one-time purchases or subscriptions",
  },
  {
    title: "Analytics",
    description: "Track how users interact with your app using a tool like Plausible or PostHog",
  },
  {
    title: "Custom domain",
    description: "Point a domain you own to your app for a more professional presence",
  },
];

// "For now" this is a static list -- the one contextual signal worth acting
// on immediately is skipping the auth suggestion when intake already asked
// for it, since suggesting a feature the app already has would be confusing.
function getSuggestedFeatures(answers: IntakeAnswers | null): FeatureSuggestion[] {
  if (!answers?.needsAccounts) return DEFAULT_SUGGESTIONS;
  return DEFAULT_SUGGESTIONS.filter((s) => s.title !== "User authentication");
}

const COACH_URL = "https://coach.createwithskai.cloud";

interface PostGenerationGuideProps {
  answers: IntakeAnswers | null;
  deployResult: DeployResult | null;
  onAddFeature: (description: string) => void;
  addingFeature: boolean;
}

export function PostGenerationGuide({
  answers,
  deployResult,
  onAddFeature,
  addingFeature,
}: PostGenerationGuideProps) {
  const [expanded, setExpanded] = useState(true);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST_ITEMS.map(() => false));

  function toggleChecked(index: number) {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  const deployedHost = deployResult ? new URL(deployResult.deploymentUrl).host : null;

  return (
    <div className="rounded-xl border border-taupe/40 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 p-4"
      >
        <span className="flex items-center gap-2 text-base font-semibold text-espresso">
          <ChecklistIcon className="h-5 w-5 flex-none text-accent-pink" />
          Before you go live
        </span>
        <ChevronIcon
          className={`h-4 w-4 flex-none text-espresso/50 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-6 border-t border-taupe/30 p-4 sm:p-5">
          {/* Section 1 -- checklist */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-espresso/60">
              Get your app ready
            </h3>
            <ul className="flex flex-col gap-2">
              {CHECKLIST_ITEMS.map((item, index) => (
                <li key={item}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-opacity hover:bg-cream ${
                      checked[index] ? "opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked[index]}
                      onChange={() => toggleChecked(index)}
                      className="mt-0.5 h-4 w-4 flex-none accent-accent-pink"
                    />
                    <span className={`text-sm text-espresso ${checked[index] ? "line-through" : ""}`}>
                      {item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 2 -- suggested next features */}
          <section className="rounded-lg border border-taupe/30">
            <button
              type="button"
              onClick={() => setSuggestionsExpanded((e) => !e)}
              className="flex w-full items-center justify-between gap-3 p-3"
            >
              <span className="text-sm font-semibold uppercase tracking-wide text-espresso/60">
                What to add next
              </span>
              <ChevronIcon
                className={`h-4 w-4 flex-none text-espresso/50 transition-transform ${
                  suggestionsExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
            {suggestionsExpanded && (
              <div className="grid gap-3 border-t border-taupe/30 p-3 sm:grid-cols-2">
                {getSuggestedFeatures(answers).map((feature) => (
                  <div
                    key={feature.title}
                    className="flex flex-col gap-2 rounded-lg border border-taupe/30 bg-cream/60 p-3"
                  >
                    <p className="text-sm font-medium text-espresso">{feature.title}</p>
                    <p className="flex-1 text-xs text-espresso/60">{feature.description}</p>
                    <Button
                      variant="dark"
                      disabled={addingFeature}
                      onClick={() => onAddFeature(`Add ${feature.title.toLowerCase()}: ${feature.description}`)}
                      className="self-start !px-3 !py-1.5 !text-xs"
                    >
                      {addingFeature ? "Adding…" : "Add this"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 3 -- after you deploy, only once a deployment exists */}
          {deployResult && (
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-espresso/60">
                Your next steps
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-taupe/30 bg-pink/10 p-3">
                  <p className="mb-1 text-sm font-semibold text-espresso">Get a custom domain</p>
                  <p className="text-xs leading-relaxed text-espresso/70">
                    Your app lives at {deployedHost}. Point a custom domain to it for a more
                    professional presence. Domains cost around $10 to $15 per year from Namecheap,
                    GoDaddy, or Squarespace Domains. Connect it through your Vercel dashboard under
                    your project's Domain settings.
                  </p>
                </div>
                <div className="rounded-lg border border-taupe/30 bg-pink/10 p-3">
                  <p className="mb-1 text-sm font-semibold text-espresso">Set up your product listing</p>
                  <p className="text-xs leading-relaxed text-espresso/70">
                    Ready to sell? Stan Store, Gumroad, and Skool all support digital product and app
                    delivery. Set up your listing, point buyers to your app URL, and you are ready to
                    take your first payment.
                  </p>
                </div>
                <div className="rounded-lg border border-taupe/30 bg-pink/10 p-3">
                  <p className="mb-1 text-sm font-semibold text-espresso">Plan your launch content</p>
                  <p className="text-xs leading-relaxed text-espresso/70">
                    Head to Skai AI Coach and tell her your app is live. She will help you write
                    launch scripts, plan a content calendar around it, and figure out the right angle
                    to introduce it to your audience.{" "}
                    <a
                      href={COACH_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-pink underline underline-offset-4"
                    >
                      coach.createwithskai.cloud
                    </a>
                  </p>
                </div>
                <div className="rounded-lg border border-taupe/30 bg-pink/10 p-3">
                  <p className="mb-1 text-sm font-semibold text-espresso">Think through your pricing</p>
                  <p className="text-xs leading-relaxed text-espresso/70">
                    Not sure what to charge? Ask Coach. She will help you think through positioning,
                    price point, and how to frame the value of what you have built.{" "}
                    <a
                      href={COACH_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-pink underline underline-offset-4"
                    >
                      coach.createwithskai.cloud
                    </a>
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
