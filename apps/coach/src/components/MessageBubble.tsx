import Markdown from "react-markdown";
import type { ComponentPropsWithoutRef } from "react";

const REAL_LINK = /^https?:\/\//i;

// Claude occasionally emits markdown link syntax around quoted phrases that
// aren't actually meant to be links. Only render a real, clickable <a> when
// the href is a genuine http(s) URL -- otherwise just show the text.
function MarkdownLink({ href, children }: ComponentPropsWithoutRef<"a">) {
  if (href && REAL_LINK.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return <>{children}</>;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
          isUser
            ? "bg-espresso text-white"
            : "border border-taupe/40 bg-white text-espresso"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="markdown-content">
            <Markdown components={{ a: MarkdownLink }}>{content || " "}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
