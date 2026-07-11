import { useEffect, useState } from "react";
import { SiteHeader } from "../SiteHeader";
import { StepWelcome } from "./StepWelcome";
import { StepConnect } from "./StepConnect";
import { StepFinish } from "./StepFinish";

type Step = 1 | 2 | 3;

const STORAGE_KEY = "hub-onboarding-step";

function readStoredStep(): Step {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return stored === 2 || stored === 3 ? stored : 1;
}

interface OnboardingWizardProps {
  onComplete: () => Promise<void>;
}

// Step is persisted to localStorage -- connecting GitHub triggers a real
// OAuth redirect away from and back to this page, which would otherwise reset
// the wizard to step 1 and force the user to click back through step 2.
export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>(readStoredStep);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  async function handleComplete() {
    localStorage.removeItem(STORAGE_KEY);
    await onComplete();
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      {step === 1 && <StepWelcome onNext={() => setStep(2)} />}
      {step === 2 && <StepConnect onNext={() => setStep(3)} />}
      {step === 3 && <StepFinish onComplete={handleComplete} />}
    </div>
  );
}
