export interface GuideLink {
  label: string;
  href: string;
}

export interface ConnectionGuide {
  id: string;
  title: string;
  subtitle: string;
  steps: string[];
  note?: string;
  extraLinks?: GuideLink[];
  primaryLink: GuideLink;
}

export const CONNECTION_GUIDES: Record<string, ConnectionGuide> = {
  anthropic: {
    id: "connection-anthropic",
    title: "Anthropic API key",
    subtitle: "Powers all AI conversations in Coach and the App Builder.",
    steps: [
      "Go to console.anthropic.com and create a free account -- it takes about two minutes",
      "Once logged in click your profile icon in the top right and select API Keys",
      'Click Create Key, give it any name like "AI Business Launchpad", and copy the key',
      "Paste it in the field below",
    ],
    note: "Anthropic charges per use with no monthly fee. For Coach conversations most users spend under $3 per month. If you are actively using the App Builder to generate and iterate on apps, costs will be higher -- a single app build typically costs $0.15 to $0.50 and multiple builds in a month could add up to $10 to $20 or more depending on how much you build. We recommend starting with a $10 top-up.",
    primaryLink: { label: "Go to Anthropic Console", href: "https://console.anthropic.com/settings/keys" },
  },
  apify: {
    id: "connection-apify",
    title: "Apify API key",
    subtitle: "Powers competitor intelligence and content scraping in Creator HQ.",
    steps: [
      "Go to apify.com and create a free account",
      "Once logged in click your profile icon and go to Settings",
      "Click Integrations in the left sidebar",
      "Copy your Personal API token and paste it in the field below",
      "Important -- you also need to save three actors to your Apify account for Creator HQ to work. Click each link below and click Save to your account on each one.",
    ],
    extraLinks: [
      { label: "Instagram Scraper", href: "https://apify.com/apify/instagram-scraper" },
      { label: "Instagram Profile Scraper", href: "https://apify.com/apify/instagram-profile-scraper" },
      { label: "TikTok Scraper", href: "https://apify.com/clockworks/tiktok-scraper" },
    ],
    note: "The free Apify tier is more than sufficient for weekly competitor tracking.",
    primaryLink: { label: "Go to Apify Settings", href: "https://console.apify.com/account/integrations" },
  },
  github: {
    id: "connection-github",
    title: "GitHub",
    subtitle: "Needed so the App Builder can push your generated code to your own repository.",
    steps: [
      "Go to github.com and create a free account if you do not have one",
      "Once logged in click Connect GitHub below -- you will be taken to GitHub to approve the connection",
      "Approve access and you will be redirected back automatically",
    ],
    primaryLink: { label: "Go to GitHub", href: "https://github.com" },
  },
  vercel: {
    id: "connection-vercel",
    title: "Vercel",
    subtitle: "Needed so the App Builder can deploy your apps to your own domain.",
    steps: [
      "Go to vercel.com and create a free account if you do not have one",
      "Once logged in click your profile picture and go to Settings",
      "Click Tokens in the left sidebar",
      'Click Create Token, name it "AI Business Launchpad", set scope to Full Account, set expiration to No expiration, and click Create',
      "Copy the token immediately -- Vercel only shows it once",
      "Paste it in the field below",
    ],
    primaryLink: { label: "Go to Vercel Tokens", href: "https://vercel.com/account/tokens" },
  },
};
