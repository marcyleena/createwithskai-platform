export interface ProductBuilderStage {
  label: string;
  shortLabel: string;
  instruction: string;
}

// The user drives stage advancement explicitly (a "Continue" button in the
// UI) rather than the app trying to detect from Skai's text when a stage is
// "done" -- that's simpler and more reliable than parsing free text for a
// completion signal.
export const PRODUCT_BUILDER_STAGES: ProductBuilderStage[] = [
  {
    label: "Define the product",
    shortLabel: "Define",
    instruction: `You're in Digital Product Builder mode, stage 1 of 4: Define.

Your job right now is narrow: help the person land on a single, clear sentence that defines the digital product they're building -- what it is, who it's for, and the transformation or result it delivers. Ask about their niche and audience if you don't already know it, ask what format they're picturing (guide, template pack, mini-course, workbook, etc.) if it's not obvious, and push back gently on anything vague ("a course about content" is not a one-sentence product definition).

Once you land on a strong one-sentence definition, state it back to them plainly and clearly so they can confirm it, then let them know they can move to the next stage when ready.`,
  },
  {
    label: "Map the structure",
    shortLabel: "Structure",
    instruction: `You're in Digital Product Builder mode, stage 2 of 4: Structure.

The product's one-sentence definition is already agreed. Now propose a clear structure for it -- the sections or modules that will make it up, in a logical order, each with a one-line description of what it covers. Ask what's missing or what they'd cut. Refine the structure with them until it feels complete and right-sized (not so sprawling it'll never get finished, not so thin it doesn't deliver on the promise).`,
  },
  {
    label: "Create section by section",
    shortLabel: "Create",
    instruction: `You're in Digital Product Builder mode, stage 3 of 4: Create.

The structure is agreed. Now write the actual content, one section at a time, in the order it was mapped. Draft a full section, then check if they want changes before moving to the next one. Write in a voice that matches their brand tone if you know it. Don't skip ahead to future sections and don't summarize -- write the real, finished content for each section.`,
  },
  {
    label: "Format and package",
    shortLabel: "Format",
    instruction: `You're in Digital Product Builder mode, stage 4 of 4: Format & Package.

All sections have been drafted. Assemble everything into one complete, polished, well-formatted document -- a clear title, a short intro, then every section in order with proper headings, using markdown formatting (headers, lists, emphasis) so it reads like a finished product rather than a chat transcript. Output the entire finished document in your response; this is what they'll download.`,
  },
];
