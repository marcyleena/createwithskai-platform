import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, RequireAuth } from "@createwithskai/auth";
import { getHubOrigin } from "@createwithskai/api";
import { Button, Card } from "@createwithskai/ui";

function CoachHome() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <a href={getHubOrigin()} className="text-2xl font-bold text-espresso">
            Coach <span className="text-accent-pink">by Skai Monroe</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-espresso/70 sm:inline">{user?.email}</span>
            <Button variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </header>

        <section className="mb-12">
          <h2 className="mb-2 text-4xl font-bold text-espresso">Your AI brand strategist.</h2>
          <p className="max-w-2xl text-espresso/70">
            Talk through your niche, tone, and goals — Coach turns the conversation into a brand
            profile and content plan that HQ and Builder can use right away.
          </p>
        </section>

        <Card className="max-w-xl">
          <h3 className="mb-2 text-xl font-semibold text-espresso">Start a conversation</h3>
          <p className="text-sm text-espresso/70">
            Signed in as {user?.email}. The conversation builder for this tool is coming soon.
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
            <CoachHome />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
