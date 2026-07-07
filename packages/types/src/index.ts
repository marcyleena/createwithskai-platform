// Shared domain types for the AI Influencer Launchpad platform.
// These mirror the Supabase `public` schema defined in supabase/schema.sql.

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCredential {
  id: string;
  user_id: string;
  provider: string;
  credential_type: string;
  value: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BrandProfile {
  id: string;
  user_id: string;
  brand_name: string;
  niche: string | null;
  tone: string | null;
  bio: string | null;
  target_audience: string | null;
  colors: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CoachConversation {
  id: string;
  user_id: string;
  title: string | null;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  created_at: string;
  updated_at: string;
}

export interface ProductBuild {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "draft" | "in_progress" | "published" | "archived";
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AppBuild {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  status: "draft" | "in_progress" | "published" | "archived";
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HqCompetitor {
  id: string;
  user_id: string;
  handle: string;
  platform: string;
  notes: string | null;
  metrics: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface HqContentCalendarItem {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  status: "idea" | "scheduled" | "published" | "skipped";
  scheduled_for: string | null;
  content: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationEvent {
  id: string;
  user_id: string;
  source: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: AppUser; Insert: Partial<AppUser>; Update: Partial<AppUser> };
      user_credentials: { Row: UserCredential; Insert: Partial<UserCredential>; Update: Partial<UserCredential> };
      brand_profiles: { Row: BrandProfile; Insert: Partial<BrandProfile>; Update: Partial<BrandProfile> };
      coach_conversations: { Row: CoachConversation; Insert: Partial<CoachConversation>; Update: Partial<CoachConversation> };
      product_builds: { Row: ProductBuild; Insert: Partial<ProductBuild>; Update: Partial<ProductBuild> };
      app_builds: { Row: AppBuild; Insert: Partial<AppBuild>; Update: Partial<AppBuild> };
      hq_competitors: { Row: HqCompetitor; Insert: Partial<HqCompetitor>; Update: Partial<HqCompetitor> };
      hq_content_calendar: { Row: HqContentCalendarItem; Insert: Partial<HqContentCalendarItem>; Update: Partial<HqContentCalendarItem> };
      integration_events: { Row: IntegrationEvent; Insert: Partial<IntegrationEvent>; Update: Partial<IntegrationEvent> };
    };
  };
}
