import { Button } from "@createwithskai/ui";
import { ApiKeyGuideCard } from "../ApiKeyGuideCard";
import { GithubGuideCard } from "../GithubGuideCard";
import { SupabaseGuideCard } from "../SupabaseGuideCard";

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
          <ApiKeyGuideCard provider="anthropic" />
          <ApiKeyGuideCard provider="apify" />
          <GithubGuideCard />
          <ApiKeyGuideCard
            provider="vercel"
            credentialType="api_token"
            valueKey="token"
            placeholder="Vercel API token"
          />
          <div>
            <SupabaseGuideCard />
            <p className="mt-1.5 px-1 text-xs text-taupe">
              Optional -- only needed for database-powered apps. You can add this later.
            </p>
          </div>
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
