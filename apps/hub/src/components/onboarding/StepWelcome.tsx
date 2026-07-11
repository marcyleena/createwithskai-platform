import { Button } from "@createwithskai/ui";
import { ToolNavCard } from "../ToolNavCard";
import { CoachIcon, HqIcon, BuilderIcon } from "../icons";

export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="mb-3 text-3xl font-bold text-espresso sm:text-4xl">
          Welcome to the AI Influencer Launchpad.
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-espresso/70 sm:text-lg">
          You have everything you need to build a real AI-powered digital business. Let us show you how it
          fits together.
        </p>

        <div className="mb-10 grid gap-6 text-left sm:grid-cols-3">
          <ToolNavCard
            icon={<CoachIcon className="h-6 w-6" />}
            title="Skai AI Coach"
            description="Your strategy and brand-building studio. She helps you figure out what to build, write your scripts, and make the right decisions at every stage."
          />
          <ToolNavCard
            icon={<HqIcon className="h-6 w-6" />}
            title="Creator HQ"
            description="Your content management studio. Competitor intelligence, content planning, performance tracking, and an AI content generator."
          />
          <ToolNavCard
            icon={<BuilderIcon className="h-6 w-6" />}
            title="App Builder"
            description="Your product creation tool. Describe an app in plain language and deploy it to your own domain without writing a single line of code."
          />
        </div>

        <Button variant="dark" onClick={onNext}>
          Let's get set up
        </Button>
      </div>
    </div>
  );
}
