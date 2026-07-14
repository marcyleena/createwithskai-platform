import { getHubOrigin } from "@createwithskai/api";
import { SiteHeader } from "../components/SiteHeader";

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent-pink underline underline-offset-4"
    >
      {children}
    </a>
  );
}

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <SiteHeader>
        <a href={getHubOrigin()} className="text-sm font-medium text-taupe hover:text-accent-pink">
          Back to home
        </a>
      </SiteHeader>

      <main className="mx-auto max-w-[720px] px-6 py-12 sm:py-16">
        <h1 className="mb-1 text-3xl font-bold text-espresso sm:text-4xl">Privacy Policy</h1>
        <p className="mb-10 text-sm text-taupe">Last updated: July 2026</p>

        <div className="space-y-10 text-espresso/90">
          <section>
            <h2 className="mb-3 text-xl font-bold text-accent-pink">Who we are</h2>
            <p className="leading-relaxed">
              The AI Influencer Launchpad is a product of the Create With Skai brand. For any
              questions or concerns you can contact us at{" "}
              <ExternalLink href="mailto:createwithskai@gmail.com">createwithskai@gmail.com</ExternalLink>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-accent-pink">What we collect and why</h2>
            <p className="mb-4 leading-relaxed">
              When you create an account we collect your email address to authenticate you and give you
              access to the platform. We do not collect your name, payment details, or any other personal
              information at signup. Payment is handled entirely by Stan Store and we never see your card
              details.
            </p>
            <p className="mb-4 leading-relaxed">
              When you use the platform you may choose to provide the following: your Anthropic API key,
              which powers the AI features in Skai AI Coach and the App Builder. Your Apify API key, which
              powers the competitor intelligence features in Creator HQ. Your GitHub OAuth token, which
              allows the App Builder to create code repositories in your GitHub account. Your Vercel API
              token, which allows the App Builder to deploy apps to your Vercel account.
            </p>
            <p className="mb-4 leading-relaxed">
              All API keys and tokens are stored encrypted and are used only to perform the actions you
              initiate. They are never shared with third parties beyond the services they were created
              for.
            </p>
            <p className="leading-relaxed">
              We also store the content you create while using the platform -- your brand profile
              information, your conversation history with Skai AI Coach, your digital product builds, your
              app builds, and the competitor and content data Creator HQ gathers on your behalf.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-accent-pink">How we use your data</h2>
            <p className="leading-relaxed">
              We use your data solely to provide the services you have signed up for. We do not sell your
              data. We do not use your data to train AI models. We do not use your data for advertising.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-accent-pink">Third parties that process your data</h2>
            <p className="mb-4 leading-relaxed">
              To deliver the platform we work with the following third party services. Each one processes
              your data only to the extent necessary to provide their service.
            </p>
            <ul className="space-y-3 leading-relaxed">
              <li>
                <span className="font-semibold text-espresso">Anthropic</span> processes the content of
                your conversations with Skai AI Coach to generate responses. Their privacy policy is at{" "}
                <ExternalLink href="https://www.anthropic.com/privacy">anthropic.com/privacy</ExternalLink>.
              </li>
              <li>
                <span className="font-semibold text-espresso">Apify</span> processes requests to scrape
                public Instagram and TikTok data on your behalf for the competitor intelligence features
                in Creator HQ. Their privacy policy is at{" "}
                <ExternalLink href="https://apify.com/privacy-policy">apify.com/privacy-policy</ExternalLink>.
              </li>
              <li>
                <span className="font-semibold text-espresso">Supabase</span> stores your account data,
                conversation history, brand profile, and all other platform data. Their privacy policy is
                at <ExternalLink href="https://supabase.com/privacy">supabase.com/privacy</ExternalLink>.
              </li>
              <li>
                <span className="font-semibold text-espresso">GitHub</span> stores the code repositories
                created by the App Builder under your GitHub account. Their privacy policy is at{" "}
                <ExternalLink href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">
                  docs.github.com/site-policy/privacy-policies/github-general-privacy-statement
                </ExternalLink>
                .
              </li>
              <li>
                <span className="font-semibold text-espresso">Vercel</span> hosts and deploys the apps you
                build with the App Builder under your Vercel account. Their privacy policy is at{" "}
                <ExternalLink href="https://vercel.com/legal/privacy-policy">
                  vercel.com/legal/privacy-policy
                </ExternalLink>
                .
              </li>
              <li>
                <span className="font-semibold text-espresso">Resend</span> delivers transactional emails
                including your account setup email. Their privacy policy is at{" "}
                <ExternalLink href="https://resend.com/legal/privacy-policy">
                  resend.com/legal/privacy-policy
                </ExternalLink>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-accent-pink">AI disclosure</h2>
            <p className="leading-relaxed">
              Skai AI Coach is an artificial intelligence system. When you use Coach you are interacting
              with an AI, not a human. This is disclosed within the Coach interface. Conversations with
              Coach are processed by Anthropic's API to generate responses.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-accent-pink">Your rights</h2>
            <p className="mb-4 leading-relaxed">
              You can delete your account and all associated data at any time from the Profile and
              Connections section of your hub dashboard at{" "}
              <ExternalLink href="https://createwithskai.cloud">createwithskai.cloud</ExternalLink>.
              Deletion is immediate and permanent. We do not retain your data after deletion.
            </p>
            <p className="leading-relaxed">
              If you are located in the European Union you have additional rights under the GDPR
              including the right to access, correct, and port your data. To exercise any of these rights
              contact us at{" "}
              <ExternalLink href="mailto:createwithskai@gmail.com">createwithskai@gmail.com</ExternalLink>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-accent-pink">Data retention</h2>
            <p className="leading-relaxed">
              We retain your data for as long as your account is active. When you delete your account all
              data is deleted immediately from our systems.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-accent-pink">Changes to this policy</h2>
            <p className="leading-relaxed">
              If we make significant changes to this policy we will notify you by email. The date at the
              top of this page reflects when the policy was last updated.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-accent-pink">Contact</h2>
            <p className="leading-relaxed">
              If you have any questions about this privacy policy contact us at{" "}
              <ExternalLink href="mailto:createwithskai@gmail.com">createwithskai@gmail.com</ExternalLink>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
