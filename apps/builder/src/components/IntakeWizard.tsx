import { useEffect, useState } from "react";
import { Button } from "@createwithskai/ui";
import { STYLE_TILES, findStyleTile } from "../lib/styleTiles";
import { deriveBuildName } from "../lib/naming";
import { loadIntakeDraft, saveIntakeDraft, clearIntakeDraft } from "../lib/intakeDraft";
import { EMPTY_ANSWERS, type IntakeAnswers, type StyleTileId } from "../lib/types";

interface IntakeWizardProps {
  onComplete: (answers: IntakeAnswers) => void;
}

type Step = "appName" | "description" | "audience" | "style" | "colors" | "features" | "ai" | "summary";

type Section = "basics" | "style" | "colors" | "features" | "ai";

interface BasicsField {
  key: "appName" | "description" | "audience";
  prompt: string;
  note?: string;
  optional?: boolean;
}

const BASICS_FIELDS: BasicsField[] = [
  {
    key: "appName",
    prompt: "What is your app called?",
    note: "No name yet? Leave it blank and we will suggest one.",
    optional: true,
  },
  { key: "description", prompt: "What does it do? Describe it in one or two sentences." },
  {
    key: "audience",
    prompt: "Who is it for?",
    note: "Be specific -- the more detail you give, the better the app fits your audience.",
  },
];

interface HistoryEntry {
  role: "assistant" | "user";
  text: string;
}

interface IntakeDraft {
  step: Step;
  editingSection: Section | null;
  answers: IntakeAnswers;
  history: HistoryEntry[];
  basicsInput: string;
}

function getDraft(): IntakeDraft | null {
  return loadIntakeDraft<IntakeDraft>();
}

function ChatBubble({ role, children }: { role: "assistant" | "user"; children: React.ReactNode }) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          role === "user" ? "bg-espresso text-white" : "border border-taupe/40 bg-white text-espresso"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function IntakeWizard({ onComplete }: IntakeWizardProps) {
  const [answers, setAnswers] = useState<IntakeAnswers>(() => getDraft()?.answers ?? EMPTY_ANSWERS);
  const [step, setStep] = useState<Step>(() => getDraft()?.step ?? "appName");
  const [history, setHistory] = useState<HistoryEntry[]>(
    () => getDraft()?.history ?? [{ role: "assistant", text: BASICS_FIELDS[0].prompt }]
  );
  const [basicsInput, setBasicsInput] = useState(() => getDraft()?.basicsInput ?? "");
  const [editingSection, setEditingSection] = useState<Section | null>(() => getDraft()?.editingSection ?? null);

  // Persist every change so switching tabs, refreshing, or coming back later
  // never loses in-progress answers -- cleared on Generate App / New Build.
  useEffect(() => {
    saveIntakeDraft({ step, editingSection, answers, history, basicsInput } satisfies IntakeDraft);
  }, [step, editingSection, answers, history, basicsInput]);

  function patch(update: Partial<IntakeAnswers>) {
    setAnswers((prev) => ({ ...prev, ...update }));
  }

  function goToSummary() {
    setEditingSection(null);
    setStep("summary");
  }

  function afterStepAdvance(nextIfNotEditing: Step) {
    if (editingSection) {
      goToSummary();
    } else {
      setStep(nextIfNotEditing);
    }
  }

  // ---- Step 1: basics (conversational) ----
  function submitBasics(e: React.FormEvent) {
    e.preventDefault();
    const field = BASICS_FIELDS.find((f) => f.key === step)!;
    const value = basicsInput.trim();
    if (!value && !field.optional) return;

    patch({ [field.key]: value } as Partial<IntakeAnswers>);
    setBasicsInput("");

    const currentIndex = BASICS_FIELDS.findIndex((f) => f.key === step);
    const nextField = BASICS_FIELDS[currentIndex + 1];
    if (nextField) {
      setHistory((prev) => [
        ...prev,
        { role: "user", text: value || "(skipped)" },
        { role: "assistant", text: nextField.prompt },
      ]);
      setStep(nextField.key);
    } else {
      setHistory((prev) => [...prev, { role: "user", text: value || "(skipped)" }]);
      afterStepAdvance("style");
    }
  }

  function renderBasicsStep() {
    const field = BASICS_FIELDS.find((f) => f.key === step)!;
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-espresso">Let's build something.</h1>
          <p className="mt-1 text-sm text-espresso/60">Answer a few questions and Skai will build your app.</p>
        </div>

        <div className="flex flex-col gap-3">
          {history.map((entry, i) => (
            <ChatBubble key={i} role={entry.role}>
              {entry.text}
            </ChatBubble>
          ))}
        </div>

        <form onSubmit={submitBasics} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={basicsInput}
              onChange={(e) => setBasicsInput(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 rounded-full border border-taupe bg-white px-4 py-2.5 text-sm text-espresso placeholder:text-taupe focus:border-accent-pink focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!field.optional && !basicsInput.trim()}
              className="px-5 py-2.5"
            >
              Next
            </Button>
          </div>
          {field.note && <p className="px-1 text-xs text-espresso/50">{field.note}</p>}
        </form>
      </div>
    );
  }

  function renderBasicsEditForm() {
    return (
      <StepShell title="Basics" onSave={goToSummary}>
        <Field label="What is your app called?" note="No name yet? Leave it blank and we will suggest one.">
          <TextInput value={answers.appName} onChange={(v) => patch({ appName: v })} />
        </Field>
        <Field label="What does it do?">
          <TextInput value={answers.description} onChange={(v) => patch({ description: v })} />
        </Field>
        <Field label="Who is it for?" note="Be specific -- the more detail you give, the better the app fits your audience.">
          <TextInput value={answers.audience} onChange={(v) => patch({ audience: v })} />
        </Field>
      </StepShell>
    );
  }

  // ---- Step 2: visual direction ----
  function renderStyleStep() {
    return (
      <StepShell
        title="How should it look and feel?"
        onSave={editingSection ? goToSummary : () => afterStepAdvance("colors")}
        saveLabel={editingSection ? "Save" : "Continue"}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STYLE_TILES.map((tile) => {
            const selected = answers.styleTile === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => patch({ styleTile: selected ? null : (tile.id as StyleTileId) })}
                className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                  selected ? "border-accent-pink bg-accent-pink/10" : "border-taupe/40 bg-white hover:border-accent-pink/60"
                }`}
              >
                <div className="flex gap-1.5">
                  {tile.swatch.map((color) => (
                    <span
                      key={color}
                      className="h-6 w-6 rounded-full border border-taupe/30"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-espresso">{tile.label}</span>
                <span className="text-xs text-espresso/60">{tile.description}</span>
              </button>
            );
          })}
        </div>

        <Field label="Or describe your vibe in your own words" note="Optional">
          <TextInput
            value={answers.customVibe}
            onChange={(v) => patch({ customVibe: v })}
            placeholder="e.g. moody and editorial, like a fashion magazine"
          />
        </Field>
      </StepShell>
    );
  }

  // ---- Step 3: colors ----
  function colorsPrompt(): string {
    if (answers.styleTile) {
      return "Do you have specific brand colors? Paste hex codes here or leave blank and we will generate a palette based on your style direction.";
    }
    if (answers.customVibe.trim()) {
      return "What colors feel right? Paste hex codes or describe them -- blush pink and gold, deep purple and cream, forest green and white.";
    }
    return "Do you have specific brand colors? Paste hex codes here or leave blank and we will generate a palette that fits your app.";
  }

  function renderColorsStep() {
    return (
      <StepShell
        title="Colors"
        onSave={editingSection ? goToSummary : () => afterStepAdvance("features")}
        saveLabel={editingSection ? "Save" : "Continue"}
      >
        <Field label={colorsPrompt()}>
          <TextInput
            value={answers.colorInput}
            onChange={(v) => patch({ colorInput: v })}
            placeholder="#FFB8EA, #1C1A18, #F5F0E8"
          />
        </Field>
      </StepShell>
    );
  }

  // ---- Step 4: features ----
  function renderFeaturesStep() {
    return (
      <StepShell
        title="What are the most important things your app needs to do?"
        onSave={
          editingSection
            ? goToSummary
            : () => afterStepAdvance(answers.usesAI ? "ai" : "summary")
        }
        saveLabel={editingSection ? "Save" : "Continue"}
      >
        <textarea
          value={answers.features}
          onChange={(e) => patch({ features: e.target.value })}
          rows={6}
          placeholder={`Be specific. Instead of "track spending" write "users can add expenses with a category, date, and amount and see a monthly total by category."\nList your three to five most important features, one per line.`}
          className="w-full rounded-xl border border-taupe bg-white px-4 py-3 text-sm text-espresso placeholder:text-taupe/80 focus:border-accent-pink focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <YesNoToggle
            label="Does it need user accounts?"
            value={answers.needsAccounts}
            onChange={(v) => patch({ needsAccounts: v })}
          />
          <YesNoToggle
            label="Does data need to save between sessions?"
            value={answers.needsPersistence}
            onChange={(v) => patch({ needsPersistence: v })}
          />
          <YesNoToggle label="Does it use AI?" value={answers.usesAI} onChange={(v) => patch({ usesAI: v })} />
        </div>
      </StepShell>
    );
  }

  // ---- Step 5: AI + special requirements ----
  function renderAIStep() {
    return (
      <StepShell title="A bit more about the AI feature" onSave={goToSummary} saveLabel={editingSection ? "Save" : "Continue"}>
        <Field label="What should the AI do in your app?">
          <textarea
            value={answers.aiDescription}
            onChange={(e) => patch({ aiDescription: e.target.value })}
            rows={4}
            placeholder="Example: analyze the user's spending and give personalized advice in a warm friendly tone."
            className="w-full rounded-xl border border-taupe bg-white px-4 py-3 text-sm text-espresso placeholder:text-taupe/80 focus:border-accent-pink focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
          />
        </Field>
        <Field label="Anything else we should know?" note="Optional">
          <TextInput value={answers.specialRequirements} onChange={(v) => patch({ specialRequirements: v })} />
        </Field>
      </StepShell>
    );
  }

  // ---- Summary ----
  function renderSummary() {
    const tile = findStyleTile(answers.styleTile);
    const suggestedName = deriveBuildName(answers.description);

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-espresso">Ready to build.</h1>
          <p className="mt-1 text-sm text-espresso/60">Review what you told Skai, then generate your app.</p>
        </div>

        <SummarySection title="Basics" onEdit={() => setEditingSection("basics")}>
          <SummaryRow label="Name" value={answers.appName.trim() || `Auto-suggested: ${suggestedName}`} />
          <SummaryRow label="What it does" value={answers.description} />
          <SummaryRow label="Who it's for" value={answers.audience} />
        </SummarySection>

        <SummarySection title="Visual direction" onEdit={() => setEditingSection("style")}>
          <SummaryRow label="Style" value={tile ? tile.label : "Not selected"} />
          {answers.customVibe.trim() && <SummaryRow label="Custom vibe" value={answers.customVibe} />}
        </SummarySection>

        <SummarySection title="Colors" onEdit={() => setEditingSection("colors")}>
          <SummaryRow
            label="Palette"
            value={answers.colorInput.trim() || "We'll generate one that matches your style direction"}
          />
        </SummarySection>

        <SummarySection title="Features" onEdit={() => setEditingSection("features")}>
          <SummaryRow label="Feature list" value={answers.features.trim() || "Not specified"} multiline />
          <SummaryRow label="User accounts" value={answers.needsAccounts ? "Yes" : "No"} />
          <SummaryRow label="Saves data between sessions" value={answers.needsPersistence ? "Yes" : "No"} />
          <SummaryRow label="Uses AI" value={answers.usesAI ? "Yes" : "No"} />
        </SummarySection>

        {answers.usesAI && (
          <SummarySection title="AI details" onEdit={() => setEditingSection("ai")}>
            <SummaryRow label="AI should" value={answers.aiDescription.trim() || "Not described"} multiline />
            {answers.specialRequirements.trim() && (
              <SummaryRow label="Special requirements" value={answers.specialRequirements} multiline />
            )}
          </SummarySection>
        )}

        <Button
          variant="dark"
          onClick={() => {
            clearIntakeDraft();
            onComplete(answers);
          }}
          className="!bg-espresso !text-white justify-center py-3 text-base"
        >
          Generate App
        </Button>
      </div>
    );
  }

  if (editingSection === "basics") return renderBasicsEditForm();
  if (editingSection === "style") return renderStyleStep();
  if (editingSection === "colors") return renderColorsStep();
  if (editingSection === "features") return renderFeaturesStep();
  if (editingSection === "ai") return renderAIStep();

  if (step === "appName" || step === "description" || step === "audience") return renderBasicsStep();
  if (step === "style") return renderStyleStep();
  if (step === "colors") return renderColorsStep();
  if (step === "features") return renderFeaturesStep();
  if (step === "ai") return renderAIStep();
  return renderSummary();
}

function StepShell({
  title,
  onSave,
  saveLabel = "Continue",
  children,
}: {
  title: string;
  onSave: () => void;
  saveLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10 sm:px-0">
      <h1 className="text-xl font-bold text-espresso">{title}</h1>
      {children}
      <Button variant="primary" onClick={onSave} className="justify-center py-2.5">
        {saveLabel}
      </Button>
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-espresso">{label}</label>
      {children}
      {note && <p className="text-xs text-espresso/50">{note}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-full border border-taupe bg-white px-4 py-2.5 text-sm text-espresso placeholder:text-taupe focus:border-accent-pink focus:outline-none focus:ring-2 focus:ring-accent-pink/30"
    />
  );
}

function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-taupe/40 bg-white px-4 py-2.5">
      <span className="text-sm text-espresso">{label}</span>
      <div className="flex flex-none gap-1.5">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            value ? "bg-accent-pink text-white" : "bg-taupe/20 text-espresso/60"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            !value ? "bg-espresso text-white" : "bg-taupe/20 text-espresso/60"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

function SummarySection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-taupe/40 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-espresso/60">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-accent-pink hover:underline">
          Edit
        </button>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <span className="block text-xs font-medium text-espresso/50">{label}</span>
      <span className={`text-sm text-espresso ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</span>
    </div>
  );
}
