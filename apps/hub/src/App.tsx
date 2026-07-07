import { Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth, RequireAuth } from "@createwithskai/auth";
import { Button, Card } from "@createwithskai/ui";
import { LoginPage } from "./pages/LoginPage";

const TOOLS = [
  {
    name: "Coach",
    description: "Your AI brand strategist — chat your way to a content plan.",
    href: "https://coach.createwithskai.cloud",
  },
  {
    name: "HQ",
    description: "Competitor tracking and content calendar, all in one place.",
    href: "https://hq.createwithskai.cloud",
  },
  {
    name: "Builder",
    description: "Turn your brand into shippable digital products and apps.",
    href: "https://build.createwithskai.cloud",
  },
];

function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-espresso">
            AI Influencer Launchpad <span className="text-accent-pink">by Skai Monroe</span>
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
            One brand. Three tools. Zero guesswork.
          </h2>
          <p className="max-w-2xl text-espresso/70">
            Coach, HQ, and Builder share a single account and brand profile so you can go from
            strategy to content to product without re-entering a thing.
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-3">
          {TOOLS.map((tool) => (
            <Card key={tool.name}>
              <h3 className="mb-2 text-xl font-semibold text-espresso">{tool.name}</h3>
              <p className="mb-4 text-sm text-espresso/70">{tool.description}</p>
              <a href={tool.href} target="_blank" rel="noreferrer">
                <Button variant="secondary">Open {tool.name}</Button>
              </a>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-bold text-espresso">Welcome back</h1>
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
