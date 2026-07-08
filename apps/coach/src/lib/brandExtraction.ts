import { supabase } from "@createwithskai/api";
import type { BrandProfile } from "@createwithskai/types";
import { quickCompletion } from "./anthropic";

interface ExtractedBrandInfo {
  brand_name?: string;
  niche?: string;
  content_direction?: string;
}

function extractionPrompt(userText: string, assistantText: string): string {
  return `You are a silent data-extraction step, not a conversational assistant. Given one exchange from a coaching conversation, determine whether the USER explicitly stated their brand name, their content niche, or their content direction / strategy / path.

Only extract what the user directly stated about themselves or their brand -- never invent or infer beyond what's said. If they didn't mention something, omit that key entirely.

Respond with ONLY a JSON object, no other text, in exactly this shape:
{"brand_name": "...", "niche": "...", "content_direction": "..."}

If nothing qualifies, respond with exactly: {}

User said: "${userText}"
Assistant replied: "${assistantText}"`;
}

function parseExtraction(raw: string): ExtractedBrandInfo | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as ExtractedBrandInfo;
  } catch {
    return null;
  }
}

// Best-effort background task: never throws, never surfaces to the user.
// Fires after a chat exchange completes; if it finds brand info, it merges
// it onto the user's single brand_profiles row (brand_name is required by
// the schema, so nothing is saved until a brand name exists).
export async function extractAndSaveBrandInfo(params: {
  apiKey: string;
  userId: string;
  userText: string;
  assistantText: string;
  currentProfile: BrandProfile | null;
}): Promise<BrandProfile | null> {
  const { apiKey, userId, userText, assistantText, currentProfile } = params;

  try {
    const raw = await quickCompletion(apiKey, extractionPrompt(userText, assistantText), 250);
    const extracted = parseExtraction(raw);
    if (!extracted) return null;
    if (!extracted.brand_name && !extracted.niche && !extracted.content_direction) return null;

    const merged = {
      user_id: userId,
      brand_name: extracted.brand_name || currentProfile?.brand_name,
      niche: extracted.niche || currentProfile?.niche || null,
      bio: extracted.content_direction || currentProfile?.bio || null,
    };
    if (!merged.brand_name) return null;

    if (currentProfile) {
      const { data } = await supabase
        .from("brand_profiles")
        .update(merged)
        .eq("id", currentProfile.id)
        .select()
        .single();
      return (data as BrandProfile) ?? null;
    }

    const { data } = await supabase.from("brand_profiles").insert(merged).select().single();
    return (data as BrandProfile) ?? null;
  } catch {
    return null;
  }
}
