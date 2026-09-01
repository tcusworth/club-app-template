import { Link } from "wouter";
import { CLUB_NAME } from "@/lib/clubConfig";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>

        <div className="mb-8 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-700 dark:text-amber-400">
          <strong>Template — not legal advice.</strong> This is placeholder Terms of
          Service content with standard section headings, meant as a starting
          point for each club deployment. It has not been reviewed by a
          lawyer and should not be published live until it has been — the
          bracketed sections below need real, deployment-specific details
          filled in.
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: [date]</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground">
              By creating an account or otherwise using {CLUB_NAME} (the "Service"), you
              agree to be bound by these Terms of Service. If you don't agree, please
              don't use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Who Runs This Service</h2>
            <p className="text-sm text-muted-foreground">
              {CLUB_NAME} is operated by [organization/individual name], [address or
              jurisdiction]. Questions about these terms can be sent to [contact email].
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Accounts</h2>
            <p className="text-sm text-muted-foreground">
              You're responsible for the accuracy of the information you provide when
              creating an account and for keeping your login credentials secure. You're
              responsible for activity that happens under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Member Conduct</h2>
            <p className="text-sm text-muted-foreground">
              Members agree not to post content that is unlawful, harassing, defamatory,
              or infringes on others' rights. [Organization] may remove content or
              suspend accounts that violate these terms — see our moderation practices
              for how that process works.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Content Ownership</h2>
            <p className="text-sm text-muted-foreground">
              You retain ownership of content you post. By posting, you grant {CLUB_NAME}
              a license to display and distribute that content as part of operating the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Termination</h2>
            <p className="text-sm text-muted-foreground">
              [Organization] may suspend or terminate accounts that violate these terms.
              You may stop using the Service and request account deletion at any time by
              contacting [contact email].
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Disclaimers &amp; Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground">
              [Standard "as-is" disclaimer and liability limitation language —
              this section in particular should be drafted or reviewed by a
              lawyer familiar with your jurisdiction, not used as-is.]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Changes to These Terms</h2>
            <p className="text-sm text-muted-foreground">
              [Organization] may update these terms from time to time. Continued use of
              the Service after changes take effect constitutes acceptance of the
              updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Governing Law</h2>
            <p className="text-sm text-muted-foreground">
              [Jurisdiction-specific governing law clause — fill in based on where the
              operating organization is based.]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p className="text-sm text-muted-foreground">
              Questions about these terms: [contact email]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
