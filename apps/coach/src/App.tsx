import { useState } from "react";
import { useAuth, RequireAuth } from "@createwithskai/auth";
import { getHubOrigin } from "@createwithskai/api";
import { Button, Card, BackToHubLink } from "@createwithskai/ui";
import type { CoachConversation } from "@createwithskai/types";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { ProductBuilderView } from "./components/ProductBuilderView";
import { useApiKey } from "./hooks/useApiKey";
import { useConversations } from "./hooks/useConversations";
import { useBrandProfile } from "./hooks/useBrandProfile";

function MissingApiKey() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <Card className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-semibold text-espresso">Add your Anthropic API key</h1>
        <p className="mb-5 text-sm text-espresso/70">
          Skai needs your own Anthropic API key to have a conversation with you. Add it once from
          your dashboard and every Launchpad tool -- including this one -- picks it up
          automatically.
        </p>
        <a href={getHubOrigin()}>
          <Button variant="dark">Go to your dashboard</Button>
        </a>
      </Card>
    </div>
  );
}

function CoachApp() {
  const { user, signOut } = useAuth();
  const { apiKey, loading: apiKeyLoading } = useApiKey();
  const {
    conversations,
    createConversation,
    saveMessages,
    renameConversation,
    deleteConversation,
    hasMore,
    loadingMore,
    loadMore,
  } = useConversations(user?.id);
  const { profile: brandProfile } = useBrandProfile(user?.id);

  const [mode, setMode] = useState<"chat" | "builder">("chat");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Bumped only on explicit navigation (picking a conversation or starting a
  // new one) so ChatView remounts and resets its local state. It must NOT
  // change when a brand-new conversation gets its id assigned mid-send --
  // see handleConversationPersisted -- otherwise the in-progress reply gets
  // wiped by the remount.
  const [chatSessionKey, setChatSessionKey] = useState(0);

  if (apiKeyLoading) return null;
  if (!apiKey) return <MissingApiKey />;

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  function handleConversationPersisted(conv: CoachConversation) {
    setActiveConversationId(conv.id);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={(id) => {
          setActiveConversationId(id);
          setChatSessionKey((k) => k + 1);
          setMode("chat");
          setSidebarOpen(false);
        }}
        onNew={() => {
          setActiveConversationId(null);
          setChatSessionKey((k) => k + 1);
          setMode("chat");
          setSidebarOpen(false);
        }}
        onRename={renameConversation}
        onDelete={(id) => {
          deleteConversation(id);
          if (id === activeConversationId) {
            setActiveConversationId(null);
            setChatSessionKey((k) => k + 1);
          }
        }}
        onOpenBuilder={() => {
          setMode("builder");
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-none items-center justify-between border-b border-taupe/30 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BackToHubLink href={getHubOrigin()} />
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-taupe/40 p-2 text-espresso/70 sm:hidden"
              aria-label="Open conversations"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
            <a href={getHubOrigin()} className="text-lg font-semibold text-espresso">
              Coach
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-espresso/70 sm:inline">{user?.email}</span>
            <Button variant="outline" onClick={() => signOut()} className="px-4 py-2 text-sm">
              Sign out
            </Button>
          </div>
        </header>

        <p className="flex-none border-b border-taupe/20 bg-cream px-4 py-1.5 text-center text-xs text-taupe sm:px-6">
          Skai is an AI coach. Conversations may be used to improve your experience.
        </p>

        <main className="min-h-0 flex-1">
          {mode === "builder" ? (
            <ProductBuilderView apiKey={apiKey} brandProfile={brandProfile} onExit={() => setMode("chat")} />
          ) : (
            <ChatView
              key={chatSessionKey}
              apiKey={apiKey}
              conversation={activeConversation}
              brandProfile={brandProfile}
              onCreateConversation={createConversation}
              onConversationPersisted={handleConversationPersisted}
              onSaveMessages={saveMessages}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  return (
    <RequireAuth>
      <CoachApp />
    </RequireAuth>
  );
}
