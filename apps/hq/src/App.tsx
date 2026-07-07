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
            HQ <span className="text-accent-pink">by Skai Monroe</span>
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
            Competitor watch and content calendar.
          </h2>
          <p className="max-w-2xl text-espresso/70">
            Track competitors, plan your content calendar, and see integration activity — all
            scoped to the brand profile you built in Coach.
          </p>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <h3 className="mb-2 text-xl font-semibold text-espresso">Competitors</h3>
            <p className="mb-4 text-sm text-espresso/70">
              Keep an eye on the accounts shaping your niche.
            </p>
            <Link to={user ? "/dashboard" : "/login"}>
              <Button variant="secondary">{user ? "View dashboard" : "Sign in"}</Button>
            </Link>
          </Card>
          <Card>
            <h3 className="mb-2 text-xl font-semibold text-espresso">Content calendar</h3>
            <p className="mb-4 text-sm text-espresso/70">
              Plan what ships and when, across every platform.
            </p>
            <Link to={user ? "/dashboard" : "/login"}>
              <Button variant="secondary">{user ? "View dashboard" : "Sign in"}</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-bold text-espresso">HQ dashboard</h1>
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
