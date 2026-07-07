import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, RequireAuth } from "@createwithskai/auth";
import { getHubOrigin } from "@createwithskai/api";
import { Button, Card } from "@createwithskai/ui";

function HqHome() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <a href={getHubOrigin()} className="text-2xl font-bold text-espresso">
            HQ <span className="text-accent-pink">by Skai Monroe</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-espresso/70 sm:inline">{user?.email}</span>
            <Button variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
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
            <p className="text-sm text-espresso/70">
              Keep an eye on the accounts shaping your niche. Coming soon.
            </p>
          </Card>
          <Card>
            <h3 className="mb-2 text-xl font-semibold text-espresso">Content calendar</h3>
            <p className="text-sm text-espresso/70">
              Plan what ships and when, across every platform. Coming soon.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <HqHome />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
