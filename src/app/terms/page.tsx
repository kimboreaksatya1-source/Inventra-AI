import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Inventra AI",
  description: "The terms that govern your use of Inventra AI.",
};

const UPDATED = "September 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-foreground">
      <Link href="/" className="text-sm text-teal-600 hover:underline">
        ← Back to Inventra AI
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-muted-foreground">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Acceptance</h2>
          <p>
            By accessing or using Inventra AI (the &ldquo;Service&rdquo;) you agree to these Terms.
            If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. The Service</h2>
          <p>
            Inventra AI analyses inventory and sales data that you provide and returns forecasts,
            recommendations, and reports. It is a decision-support tool. You are responsible for any
            purchasing, pricing, or operational decisions you make.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Your account</h2>
          <p>
            You sign in with a Google account and are responsible for activity under it. You must
            provide accurate information and only upload data you have the right to use.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Acceptable use</h2>
          <p>
            You agree not to misuse the Service, including attempting to disrupt it, reverse
            engineer it, access other users&rsquo; data, or use it to violate any law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. AI-generated output</h2>
          <p>
            Recommendations and briefs are generated automatically and may be inaccurate or
            incomplete. They are provided &ldquo;as is&rdquo; without warranty. Verify important
            figures before acting on them.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Inventra AI is not liable for any indirect or
            consequential loss, or for losses arising from decisions made using the Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Changes and termination</h2>
          <p>
            We may update these Terms or modify or discontinue the Service at any time. We may
            suspend accounts that breach these Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">8. Contact</h2>
          <p>
            Questions about these Terms:{" "}
            <a className="text-teal-600 hover:underline" href="mailto:kimboreaksatya1@gmail.com">
              kimboreaksatya1@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
