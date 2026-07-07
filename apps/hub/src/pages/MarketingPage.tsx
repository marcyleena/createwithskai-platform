import { Link } from "react-router-dom";
import { Button } from "@createwithskai/ui";
import { SiteHeader } from "../components/SiteHeader";
import { ToolNavCard } from "../components/ToolNavCard";
import { CoachIcon, HqIcon, BuilderIcon } from "../components/icons";

const STAN_STORE_URL = "https://stan.store/createwithskai";

const TOOLS = [
  {
    icon: <CoachIcon className="h-6 w-6" />,
    title: "Skai AI Influencer Coach",
    description:
      "Talk through your niche, your voice, and your next move with an AI trained on what actually works for creators. Coach turns that conversation into a brand profile and a content plan.",
  },
  {
    icon: <HqIcon className="h-6 w-6" />,
    title: "Creator HQ",
    description:
      "Track the accounts you're competing with and plan your content calendar in one place, instead of splitting the work across screenshots, spreadsheets, and sticky notes.",
  },
  {
    icon: <BuilderIcon className="h-6 w-6" />,
    title: "App Builder",
    description:
      "Turn what you've built into something people can buy — a digital product or a small app — without learning to code first.",
  },
];

export function MarketingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader>
        <Link to="/login">
          <Button variant="outline">Sign in</Button>
        </Link>
      </SiteHeader>

      <main>
        {/* Hero */}
        <section className="px-6 pb-16 pt-16 sm:pb-20 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-accent-pink">
              The AI Influencer Launchpad
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-espresso sm:text-5xl">
              Build an influencer brand without guessing your way through it.
            </h1>
            <p className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-espresso/70 sm:text-lg">
              Skai Monroe put the process she actually uses — for strategy, competitive research,
              and shipping real products — into three tools that share one account. Make a
              decision once, use it everywhere.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href={STAN_STORE_URL} target="_blank" rel="noreferrer">
                <Button variant="primary" className="px-8 py-3 text-base">
                  Get the Launchpad
                </Button>
              </a>
              <Link
                to="/login"
                className="text-sm font-medium text-espresso/70 underline underline-offset-4 hover:text-espresso"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-10 max-w-xl text-center">
              <h2 className="mb-3 text-2xl font-bold text-espresso sm:text-3xl">
                Three tools. One brand.
              </h2>
              <p className="text-espresso/70">
                Each one works on its own. Together, they carry your brand profile from strategy
                to something you can actually sell.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {TOOLS.map((tool) => (
                <ToolNavCard key={tool.title} {...tool} />
              ))}
            </div>
          </div>
        </section>

        {/* How it fits together */}
        <section className="border-y border-taupe/30 bg-white/40 px-6 py-16">
          <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 sm:items-center">
            <div>
              <h2 className="mb-4 text-2xl font-bold text-espresso sm:text-3xl">
                One account. No re-entering yourself three times.
              </h2>
              <p className="text-espresso/70">
                Set up your brand once in Coach, and Creator HQ and App Builder already know your
                niche, your tone, and your audience. You spend the time on the work, not on
                re-explaining who you are to a different tool.
              </p>
            </div>
            <ul className="space-y-4 text-espresso/80">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-none rounded-full bg-accent-pink" />
                <span>A single sign-in across Coach, HQ, and Builder.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-none rounded-full bg-accent-pink" />
                <span>Your brand profile follows you from tool to tool.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-none rounded-full bg-accent-pink" />
                <span>Bring your own API keys and connect the accounts you already use.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="mb-4 text-2xl font-bold text-espresso sm:text-3xl">
              Ready to see it for yourself?
            </h2>
            <p className="mb-8 text-espresso/70">
              Get access to Coach, HQ, and Builder, and start with whichever one solves your next
              problem.
            </p>
            <a href={STAN_STORE_URL} target="_blank" rel="noreferrer">
              <Button variant="primary" className="px-8 py-3 text-base">
                Get the Launchpad
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-taupe/30 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm text-espresso/60 sm:flex-row">
          <span>The AI Influencer Launchpad by Skai Monroe</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
