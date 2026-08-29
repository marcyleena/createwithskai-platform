import { FIXED_SECTIONS } from "../lib/considerations";
import type { ConsiderationAnswer } from "../lib/types";

interface ConsiderationsChecklistProps {
  considerations: Record<string, ConsiderationAnswer>;
  onAnswer: (question: string, answer: ConsiderationAnswer) => void;
  dynamicQuestions: string[] | null;
  dynamicLoading: boolean;
  dynamicError: string | null;
}

const ANSWER_OPTIONS: { value: ConsiderationAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
];

function QuestionCard({
  question,
  answer,
  onAnswer,
}: {
  question: string;
  answer: ConsiderationAnswer;
  onAnswer: (question: string, answer: ConsiderationAnswer) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-taupe/40 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-espresso">{question}</span>
      <div className="flex flex-none gap-1.5">
        {ANSWER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onAnswer(question, opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              answer === opt.value ? "bg-accent-pink text-white" : "bg-cream text-espresso"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="border-t-2 border-accent-pink pt-3">
      <h3 className="text-base font-bold text-espresso">{title}</h3>
    </div>
  );
}

export function ConsiderationsChecklist({
  considerations,
  onAnswer,
  dynamicQuestions,
  dynamicLoading,
  dynamicError,
}: ConsiderationsChecklistProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold text-espresso">Considerations for your app</h2>
          <p className="mt-1 text-xs text-taupe">
            These questions are specific to what you are building. Your answers will be included in the
            generation.
          </p>
        </div>

        {dynamicLoading && (
          <div className="flex items-center gap-2 text-sm text-espresso/50">
            <span className="h-3.5 w-3.5 flex-none animate-spin rounded-full border-2 border-taupe/40 border-t-accent-pink" />
            Thinking about your app...
          </div>
        )}

        {!dynamicLoading && dynamicError && <p className="text-xs text-espresso/50">{dynamicError}</p>}

        {!dynamicLoading &&
          !dynamicError &&
          dynamicQuestions &&
          dynamicQuestions.map((question) => (
            <QuestionCard
              key={question}
              question={question}
              answer={considerations[question] ?? "not_sure"}
              onAnswer={onAnswer}
            />
          ))}
      </div>

      {FIXED_SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-3">
          <SectionHeading title={section.title} />
          {section.questions.map((question) => (
            <QuestionCard
              key={question}
              question={question}
              answer={considerations[question] ?? "not_sure"}
              onAnswer={onAnswer}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
