import { Button } from "@createwithskai/ui";
import { OnboardingApiKeyCard } from "./OnboardingApiKeyCard";
import { OnboardingGithubCard } from "./OnboardingGithubCard";

export function StepConnect({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-espresso sm:text-4xl">
          Connect your tools.
        </h1>
        <p className="mb-8 text-center text-espresso/70">
          These connections power everything. You can skip any of them now and add them later from your
          dashboard.
        </p>

        <div className="space-y-4">
          <OnboardingApiKeyCard
            provider="anthropic"
            label="Anthropic API key"
            description={
              <>
                Powers all AI conversations in Coach and the App Builder. Get your key at{" "}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-pink underline underline-offset-4"
                >
                  console.anthropic.com
                </a>{" "}
                -- it is pay as you go with no monthly fee.
              </>
            }
          />
          <OnboardingApiKeyCard
            provider="apify"
            label="Apify API key"
            description={
              <>
                Powers the competitor intelligence and scraping features in Creator HQ. Get your key at{" "}
                <a
                  href="https://apify.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-pink underline underline-offset-4"
                >
                  apify.com
                </a>
                .
              </>
            }
          />
          <OnboardingGithubCard />
          <OnboardingApiKeyCard
            provider="vercel"
            label="Vercel API token"
            credentialType="api_token"
            valueKey="token"
            placeholder="Vercel API token"
            description={
              <>
                Deploys what the App Builder generates straight to your own Vercel account. Get your
                token at{" "}
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-pink underline underline-offset-4"
                >
                  vercel.com/account/tokens
                </a>
                .
              </>
            }
          />
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="dark" onClick={onNext}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
