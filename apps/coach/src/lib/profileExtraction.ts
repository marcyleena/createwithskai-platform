import type { ChatMessage } from "../hooks/useConversations";

export interface UserProfile {
  name?: string;
  niche?: string;
  contentType?: string;
  platform?: string;
  brandName?: string;
  journeyStage?: "beginner" | "active" | "growing";
  audience?: string;
  lastUpdated?: string;
}

const isCleanPhrase = (value: string): boolean => {
  if (!value) return false;
  const words = value.trim().split(/\s+/);
  if (words.length > 4) return false;
  const junkWords = /\b(this|that|right|now|are|is|in|it|just|the|a|an|and|or|but|so|we|they|you|i|my|me|our)\b/i;
  if (junkWords.test(value)) return false;
  if (/[,;:?!]/.test(value)) return false;
  return true;
};

export function extractProfileFromConversation(messages: ChatMessage[]): UserProfile | null {
  const recentMessages = messages.slice(-6);
  const text = recentMessages.map((m) => m.content).join(" ");

  const profile: UserProfile = {};

  const nicheExplicitMatch = text.match(/(?:my niche is|i'?m in the|i work in|i focus on)\s+([a-zA-Z][a-zA-Z\s&+/-]{1,30}?)(?:\s+(?:space|niche|industry|field))?(?:\.|,|$)/i);
  if (nicheExplicitMatch) {
    const candidate = nicheExplicitMatch[1].trim();
    if (isCleanPhrase(candidate)) profile.niche = candidate;
  }
  if (!profile.niche) {
    const nicheKeywordMatch = text.match(/\b(fitness coaching?|fitness|travel|beauty|skincare|fashion|business coaching?|personal finance|wellness|food|lifestyle|gaming|parenting|cooking|photography|real estate)\b/i);
    if (nicheKeywordMatch) {
      profile.niche = nicheKeywordMatch[1].trim();
    }
  }

  const contentMatch = text.match(/(?:i want to post|i(?:'m| am) posting|i create|i make)\s+([a-zA-Z][a-zA-Z\s]{1,25}?)(?:\s+on|\s+for|\.|\,|$)/i);
  if (contentMatch) {
    const candidate = contentMatch[1].trim();
    if (isCleanPhrase(candidate)) profile.contentType = candidate;
  }

  const platformMatch = text.match(/\b(instagram|tiktok|youtube|twitter|linkedin|pinterest|facebook)\b/i);
  if (platformMatch) {
    profile.platform = platformMatch[1].charAt(0).toUpperCase() + platformMatch[1].slice(1).toLowerCase();
  }

  const nameMatch = text.match(/(?:called|named|her name is|his name is|the name is)\s+([A-Z][a-zA-Z]{1,20})\b/);
  if (nameMatch) {
    const candidate = nameMatch[1].trim();
    if (isCleanPhrase(candidate)) profile.brandName = candidate;
  }

  if (/just starting|beginner|first time|from scratch|new to this/i.test(text)) {
    profile.journeyStage = "beginner";
  } else if (/already (posting|have|launched|started)/i.test(text)) {
    profile.journeyStage = "active";
  } else if (/want to (grow|scale|monetize)/i.test(text)) {
    profile.journeyStage = "growing";
  }

  const audienceMatch = text.match(/(?:target audience is|my audience (?:is|are)|targeting)\s+([a-zA-Z][a-zA-Z\s]{1,25}?)(?:\.|\,|who|that|$)/i);
  if (audienceMatch) {
    const candidate = audienceMatch[1].trim();
    if (isCleanPhrase(candidate)) profile.audience = candidate;
  }

  if (Object.keys(profile).length > 0) {
    profile.lastUpdated = new Date().toISOString();
    return profile;
  }

  return null;
}
