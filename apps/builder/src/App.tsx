import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, RequireAuth } from "@createwithskai/auth";
import { getHubOrigin } from "@createwithskai/api";
import { Button, Card } from "@createwithskai/ui";

function BuilderHome() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <a href={getHubOrigin()} className="text-2xl font-bold text-espresso">
            Builder <span className="text-accent-pink">by Skai Monroe</span>
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
            Turn your brand into shippable products.
          </h2>
          <p className="max-w-2xl text-espresso/70">
            Build digital products and mini apps from the brand profile you set up in Coach — no
            separate onboarding required.
          </p>
        </section>

        <Card className="max-w-xl">
          <h3 className="mb-2 text-xl font-semibold text-espresso">Start a build</h3>
          <p className="text-sm text-espresso/70">
            Signed in as {user?.email}. The build workspace for this tool is coming soon.
          </p>
        </Card>
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
            <BuilderHome />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
