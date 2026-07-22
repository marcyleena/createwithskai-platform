import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@createwithskai/auth";
import { Button } from "@createwithskai/ui";
import { SiteHeader } from "../components/SiteHeader";
import { ToolNavCard } from "../components/ToolNavCard";
import { ApiKeyField } from "../components/ApiKeyField";
import { OAuthConnectionCard } from "../components/OAuthConnectionCard";
import { GettingStartedChecklist } from "../components/dashboard/GettingStartedChecklist";
import { NextStepPrompt } from "../components/dashboard/NextStepPrompt";
import { DeleteAccountSection } from "../components/dashboard/DeleteAccountSection";
import { CoachIcon, HqIcon, BuilderIcon, GitHubIcon } from "../components/icons";
import { useGithubConnected } from "../hooks/useGithubConnected";

const TOOL_LINKS = [
  {
    icon: <CoachIcon className="h-6 w-6" />,
    title: "Coach",
    description: "Chat through your brand strategy and content plan.",
    cta: { label: "Open Coach", href: "https://coach.createwithskai.cloud" },
  },
  {
    icon: <HqIcon className="h-6 w-6" />,
    title: "Creator HQ",
    description: "Competitor tracking and your content calendar.",
    cta: { label: "Open HQ", href: "https://hq.createwithskai.cloud" },
  },
  {
    icon: <BuilderIcon className="h-6 w-6" />,
    title: "App Builder",
    description: "Turn your brand into a product or app.",
    cta: { label: "Open Builder", href: "https://build.createwithskai.cloud" },
  },
];

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { connected: githubConnected, loading: githubLoading, connect, disconnect } = useGithubConnected();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  async function handleConnect(provider: "github") {
    setBusyProvider(provider);
    setOauthError(null);
    const { error } = await connect(provider);
    if (error) setOauthError(error);
    setBusyProvider(null);
  }

  async function handleDisconnect(provider: string) {
    setBusyProvider(provider);
    setOauthError(null);
    const { error } = await disconnect(provider);
    if (error) setOauthError(error);
    setBusyProvider(null);
  }

  const fullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const firstName = fullName.split(" ")[0];

  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader>
        <span className="hidden text-sm text-espresso/70 sm:inline">{user?.email}</span>
        <Button variant="outline" onClick={() => signOut()}>
          Sign out
        </Button>
      </SiteHeader>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-bold text-espresso">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-espresso/70">Pick up where you left off in one of your tools.</p>
        </div>

        <GettingStartedChecklist />

        <section className="mb-16 grid gap-6 sm:grid-cols-3">
          {TOOL_LINKS.map((tool) => (
            <ToolNavCard key={tool.title} {...tool} />
          ))}
        </section>

        <NextStepPrompt />

        <section id="profile-connections">
          <h2 className="mb-1 text-xl font-bold text-espresso">Profile &amp; connections</h2>
          <p className="mb-6 text-sm text-espresso/70">
            Manage the API keys and connected accounts your tools use on your behalf.
          </p>

          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-espresso/60">
                API keys
              </h3>
              <div className="space-y-4">
                <ApiKeyField
                  provider="anthropic"
                  label="Anthropic"
                  description="Powers Coach's conversations. Used only for your account."
                />
                <ApiKeyField
                  provider="apify"
                  label="Apify"
                  description="Powers competitor and content research in Creator HQ."
                />
                <ApiKeyField
                  provider="vercel"
                  label="Vercel"
                  description="Deploys what App Builder ships straight to your own account."
                  placeholder="Vercel API token"
                  credentialType="api_token"
                  valueKey="token"
                  helperText={
                    <>
                      Get your token at{" "}
                      <a
                        href="https://vercel.com/account/tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent-pink underline underline-offset-4"
                      >
                        vercel.com/account/tokens
                      </a>
                    </>
                  }
                />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-espresso/60">
                Connections
              </h3>
              <div className="space-y-4">
                <OAuthConnectionCard
                  icon={<GitHubIcon className="h-5 w-5" />}
                  name="GitHub"
                  description="Needed so App Builder can push the code it generates for you."
                  connected={!githubLoading && githubConnected}
                  busy={busyProvider === "github"}
                  onConnect={() => handleConnect("github")}
                  onDisconnect={() => handleDisconnect("github")}
                />
              </div>
              {oauthError && <p className="mt-3 text-sm text-red-600">{oauthError}</p>}
            </div>
          </div>

          <DeleteAccountSection />
        </section>
      </main>

      <footer className="border-t border-taupe/30 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm text-espresso/60 sm:flex-row">
          <span>The AI Business Launchpad by Skai Monroe</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-taupe hover:text-accent-pink">
              Privacy Policy
            </Link>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
