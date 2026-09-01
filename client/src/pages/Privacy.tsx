import { Link } from "wouter";
import { CLUB_NAME } from "@/lib/clubConfig";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>

        <div className="mb-8 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-700 dark:text-amber-400">
          <strong>Template — not legal advice.</strong> This is placeholder Privacy
          Policy content with standard section headings, meant as a starting
          point for each club deployment. It has not been reviewed by a
          lawyer and should not be published live until it has been — the
          bracketed sections below need real, deployment-specific details
          filled in, and the data listed below should be checked against
          what this specific deployment actually collects.
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: [date]</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. What This Covers</h2>
            <p className="text-sm text-muted-foreground">
              This policy explains what information {CLUB_NAME} collects, how it's used,
              and the choices you have about it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <p className="text-sm text-muted-foreground mb-2">
              [Confirm this list matches what the deployment actually collects
              before publishing — it should reflect the real signup fields,
              custom profile fields configured, and any integrations enabled.]
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Account information: name, email address, password (stored as a hash, never in plain text)</li>
              <li>Profile information you choose to add: bio, organization, job title, location, and any custom profile fields</li>
              <li>Content you post: discussions, replies, documents you upload, direct messages</li>
              <li>Usage information: pages visited, actions taken, for basic analytics and troubleshooting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Information</h2>
            <p className="text-sm text-muted-foreground">
              To operate the Service — authenticating you, displaying your profile and
              posts to other members, sending notifications and digest emails you've
              opted into, and moderating content per our community guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. What We Don't Do</h2>
            <p className="text-sm text-muted-foreground">
              [Organization] does not sell member data to third parties. [Confirm this
              statement is accurate for this deployment before publishing — e.g. if
              analytics or other third-party services are enabled, they should be
              disclosed here instead of using this blanket statement.]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Data Sharing</h2>
            <p className="text-sm text-muted-foreground">
              Your profile and posts are visible to other members per the visibility
              settings you choose (e.g. public vs. private/secret groups). We may share
              data with service providers who help us operate the Service (e.g. email
              delivery, file storage) under confidentiality obligations, or when required
              by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Your Choices</h2>
            <p className="text-sm text-muted-foreground">
              You can update or delete your profile information at any time from your
              account settings. You can opt out of digest and notification emails. To
              request full account deletion, contact [contact email].
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Data Retention</h2>
            <p className="text-sm text-muted-foreground">
              [Specify how long data is retained after account deletion, and whether
              any content — like posts left by a deleted account — is retained in
              anonymized form.]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Security</h2>
            <p className="text-sm text-muted-foreground">
              We take reasonable measures to protect member data, including hashed
              passwords and access controls on administrative functions. No system is
              completely secure, and we can't guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Children's Privacy</h2>
            <p className="text-sm text-muted-foreground">
              [State the Service's minimum age policy — e.g. "not intended for
              users under 13/16" depending on jurisdiction — and confirm this
              matches how signup is actually configured.]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground">
              We may update this policy from time to time. Material changes will be
              communicated to members before they take effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p className="text-sm text-muted-foreground">
              Questions about this policy or your data: [contact email]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
