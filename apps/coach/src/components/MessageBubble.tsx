import Markdown from "react-markdown";

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
            <Markdown>{content || " "}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
