import { useState } from "react";
import { Button } from "@createwithskai/ui";
import type { CoachConversation } from "@createwithskai/types";

interface SidebarProps {
  conversations: CoachConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onOpenBuilder: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onOpenBuilder,
  isOpen,
  onClose,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  function startRename(conv: CoachConversation) {
    setEditingId(conv.id);
    setDraftTitle(conv.title || "Untitled conversation");
  }

  function commitRename(id: string) {
    const trimmed = draftTitle.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-espresso/40 sm:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-none flex-col border-r border-taupe/30 bg-white transition-transform sm:static sm:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-2 border-b border-taupe/30 p-4">
          <Button variant="dark" onClick={onNew} className="w-full justify-center">
            New conversation
          </Button>
          <Button variant="outline" onClick={onOpenBuilder} className="w-full justify-center">
            Digital Product Builder
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <p className="p-3 text-sm text-espresso/50">Your conversations will show up here.</p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group mb-1 flex items-center gap-1 rounded-lg px-2 py-2 text-sm ${
                conv.id === activeId ? "bg-accent-pink/15 text-espresso" : "text-espresso/80 hover:bg-cream"
              }`}
            >
              {editingId === conv.id ? (
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={() => commitRename(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(conv.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="min-w-0 flex-1 rounded border border-accent-pink bg-white px-2 py-1 text-sm text-espresso outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(conv.id)}
                  className="min-w-0 flex-1 truncate text-left"
                  title={conv.title || "Untitled conversation"}
                >
                  {conv.title || "Untitled conversation"}
                </button>
              )}

              {editingId !== conv.id && (
                <div className="flex flex-none items-center gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => startRename(conv)}
                    title="Rename"
                    className="rounded p-1 text-espresso/50 hover:text-accent-pink"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(conv.id)}
                    title="Delete"
                    className="rounded p-1 text-espresso/50 hover:text-red-600"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
