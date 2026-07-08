import { useState } from "react";
import { Button } from "@createwithskai/ui";
import { INTAKE_QUESTIONS } from "../lib/systemPrompts";
import type { IntakeAnswers } from "../lib/types";

interface IntakeChatProps {
  onComplete: (answers: IntakeAnswers) => void;
}

interface HistoryEntry {
  role: "assistant" | "user";
  text: string;
}

export function IntakeChat({ onComplete }: IntakeChatProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { role: "assistant", text: INTAKE_QUESTIONS[0].prompt },
  ]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<IntakeAnswers>>({});
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const question = INTAKE_QUESTIONS[questionIndex];
    const nextAnswers = { ...answers, [question.key]: trimmed };
    setAnswers(nextAnswers);
    setInput("");

    const nextIndex = questionIndex + 1;
    if (nextIndex < INTAKE_QUESTIONS.length) {
      setHistory((prev) => [
        ...prev,
        { role: "user", text: trimmed },
        { role: "assistant", text: INTAKE_QUESTIONS[nextIndex].prompt },
      ]);
      setQuestionIndex(nextIndex);
    } else {
      setHistory((prev) => [...prev, { role: "user", text: trimmed }]);
      onComplete(nextAnswers as IntakeAnswers);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10 sm:px-0">
      <div>
        <h1 className="text-2xl font-bold text-espresso">Let's build something.</h1>
        <p className="mt-1 text-sm text-espresso/60">
          Answer a few quick questions and Skai will generate a working prototype.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {history.map((entry, i) => (
          <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                entry.role === "user"
                  ? "bg-espresso text-white"
                  : "border border-taupe/40 bg-white text-espresso"
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer..."
          className="flex-1 rounded-full border border-taupe bg-white px-4 py-2.5 text-sm text-espresso placeholder:text-taupe focus:border-accent-pink focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
        />
        <Button type="submit" variant="primary" disabled={!input.trim()} className="px-5 py-2.5">
          {questionIndex + 1 < INTAKE_QUESTIONS.length ? "Next" : "Generate"}
        </Button>
      </form>

      <p className="text-center text-xs text-espresso/40">
        Question {questionIndex + 1} of {INTAKE_QUESTIONS.length}
      </p>
    </div>
  );
}
