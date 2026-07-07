import { Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth, RequireAuth } from "@createwithskai/auth";
import { Button, Card } from "@createwithskai/ui";
import { LoginPage } from "./pages/LoginPage";

function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-espresso">
            Builder <span className="text-accent-pink">by Skai Monroe</span>
          </h1>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-espresso/70">{user.email}</span>
              <Button variant="outline" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="primary">Sign in</Button>
            </Link>
          )}
        </header>

        <section className="mb-12">
          <h2 className="mb-2 text-4xl font-bold text-espresso">
            Turn your brand into shippable products.
          </h2>
          <p className="max-w-2xl text-espresso/70">
            Build digital products and mini apps from the brand profile you set up in Coach —
            no separate onboarding required.
          </p>
        </section>

        <Card className="max-w-xl">
          <h3 className="mb-2 text-xl font-semibold text-espresso">Start a build</h3>
          <p className="mb-4 text-sm text-espresso/70">
            Sign in to see your product and app builds in progress.
          </p>
          <Link to={user ? "/dashboard" : "/login"}>
            <Button variant="secondary">{user ? "Go to dashboard" : "Sign in to begin"}</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-bold text-espresso">Your builds</h1>
        <p className="text-espresso/70">Signed in as {user?.email}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
