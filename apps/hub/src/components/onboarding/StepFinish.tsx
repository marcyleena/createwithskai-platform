import { useState } from "react";
import { Button } from "@createwithskai/ui";

interface StepFinishProps {
  // Marks onboarding_completed=true in Supabase. Awaited before navigating so
  // the update isn't lost to the browser cancelling in-flight requests during
  // an unload (relevant for the cross-origin "Open Coach" link).
  onComplete: () => Promise<void>;
}

export function StepFinish({ onComplete }: StepFinishProps) {
  const [navigating, setNavigating] = useState(false);

  async function handleOpenCoach() {
    setNavigating(true);
    await onComplete();
    window.location.href = "https://coach.createwithskai.cloud";
  }

  async function handleDashboard() {
    setNavigating(true);
    // No explicit navigation -- once onComplete() flips onboarding_completed
    // to true, the root route re-renders the Dashboard in place of this wizard.
    await onComplete();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:py-16">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-3 text-3xl font-bold text-espresso sm:text-4xl">
          You are ready. Start with Coach.
        </h1>
        <p className="mb-8 text-espresso/70 sm:text-lg">
          Coach is where everything begins. Tell her what you are working on and she will help you figure
          out your content direction, build your brand foundation, and tell you exactly what to do next.
          The other tools become more useful once you have that foundation in place.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="dark" onClick={handleOpenCoach} disabled={navigating}>
            Open Coach
          </Button>
          <Button variant="outline" onClick={handleDashboard} disabled={navigating}>
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
