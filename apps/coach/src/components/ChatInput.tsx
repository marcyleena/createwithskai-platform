import { useCallback, useRef, type ReactNode } from "react";
import { Button } from "@createwithskai/ui";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import type { PendingAttachment } from "../lib/fileReading";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  attachments: PendingAttachment[];
  onAddFiles: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
  /** Rendered above the input row, inside the same footer chrome (e.g. the suggestions toggle). */
  topSlot?: ReactNode;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  attachments,
  onAddFiles,
  onRemoveAttachment,
  topSlot,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseValueRef = useRef("");

  const handleTranscript = useCallback(
    (text: string) => {
      const base = baseValueRef.current;
      onChange(base ? `${base} ${text}` : text);
    },
    [onChange]
  );
  const { supported: voiceSupported, listening, toggle } = useSpeechRecognition(handleTranscript);

  const toggleVoice = useCallback(() => {
    if (!listening) baseValueRef.current = value;
    toggle();
  }, [listening, toggle, value]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || (!value.trim() && attachments.length === 0)) return;
    onSend();
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-taupe/30 bg-cream p-3 sm:p-4">
      {topSlot && <div className="mb-2">{topSlot}</div>}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1.5 rounded-full border border-taupe/40 bg-white px-3 py-1 text-xs text-espresso"
            >
              {a.name}
              <button
                type="button"
                onClick={() => onRemoveAttachment(a.id)}
                className="text-espresso/50 hover:text-espresso"
                aria-label={`Remove ${a.name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,.md"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach a file or image"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-taupe/40 text-espresso/60 hover:border-accent-pink hover:text-accent-pink"
        >
          <PaperclipIcon className="h-4 w-4" />
        </button>

        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            title={listening ? "Stop listening" : "Speak your message"}
            className={`flex h-10 w-10 flex-none items-center justify-center rounded-full border transition-colors ${
              listening
                ? "border-accent-pink bg-accent-pink text-white"
                : "border-taupe/40 text-espresso/60 hover:border-accent-pink hover:text-accent-pink"
            }`}
          >
            <MicIcon className="h-4 w-4" />
          </button>
        )}

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
          placeholder={listening ? "Listening..." : "Message Skai..."}
          className="max-h-32 flex-1 resize-none rounded-2xl border border-taupe bg-white px-4 py-2.5 text-sm text-espresso placeholder:text-taupe focus:border-accent-pink focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
        />

        <Button
          type="submit"
          variant="primary"
          disabled={disabled || (!value.trim() && attachments.length === 0)}
          className="!bg-accent-pink px-5 py-2.5 !text-white hover:!bg-accent-pink/90"
        >
          Send
        </Button>
      </div>
    </form>
  );
}

function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path
        d="M21 9.5 12.5 18a4 4 0 0 1-5.66-5.66l8.48-8.48a2.5 2.5 0 0 1 3.54 3.54l-8.49 8.48a1 1 0 0 1-1.41-1.41l7.78-7.78"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4" strokeLinecap="round" />
    </svg>
  );
}
