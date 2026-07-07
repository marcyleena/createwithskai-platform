import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@createwithskai/auth";
import { MarketingPage } from "./pages/MarketingPage";
import { Dashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/LoginPage";

function RootPage() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return user ? <Dashboard /> : <MarketingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
