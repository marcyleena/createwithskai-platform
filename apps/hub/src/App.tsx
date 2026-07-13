import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@createwithskai/auth";
import { MarketingPage } from "./pages/MarketingPage";
import { Dashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { useOnboarding } from "./hooks/useOnboarding";

function RootPage() {
  const { user, loading: authLoading } = useAuth();
  const { completed, loading: onboardingLoading, markCompleted } = useOnboarding();

  if (authLoading) return null;
  if (!user) return <MarketingPage />;
  if (onboardingLoading || completed === null) return null;

  return completed ? <Dashboard /> : <OnboardingWizard onComplete={markCompleted} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
