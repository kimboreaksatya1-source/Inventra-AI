import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Inventra AI",
  description: "How Inventra AI collects, uses, and protects your data.",
};

const UPDATED = "September 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-foreground">
      <Link href="/" className="text-sm text-teal-600 hover:underline">
        ← Back to Inventra AI
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-muted-foreground">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Who we are</h2>
          <p>
            Inventra AI (&ldquo;Inventra&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an
            AI-powered operating copilot that turns a small business&rsquo;s inventory and sales
            data into decisions. This policy explains what we collect and why.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Information we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Google account information.</strong> When you sign in with Google we receive
              your name, email address, and profile picture. We use this only to create and
              identify your account.
            </li>
            <li>
              <strong>Business data you provide.</strong> Product lists, stock levels, sales
              figures, and prices that you upload or enter. This is stored against your account and
              used to generate analysis, forecasts, and recommendations for you.
            </li>
            <li>
              <strong>Usage data.</strong> Basic technical logs (request times, errors) needed to
              operate and secure the service.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">How we use your information</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>To authenticate you and keep your data scoped to your account.</li>
            <li>
              To compute inventory analysis, demand forecasts, and procurement recommendations.
            </li>
            <li>To operate, maintain, and improve the service.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Sharing</h2>
          <p>
            We do not sell your data. We share data only with infrastructure providers that run the
            service on our behalf: hosting (Vercel), database (Supabase), and, when you use the
            Business Brief / Copilot features, the AI model provider that generates those responses.
            Your Google account data is never used for advertising.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Retention</h2>
          <p>
            We keep your data for as long as your account is active. You can delete your data at any
            time by contacting us, after which it is removed from our production database.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data by emailing
            us at the address below.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            Questions about this policy:{" "}
            <a className="text-teal-600 hover:underline" href="mailto:kimboreaksatya1@gmail.com">
              kimboreaksatya1@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
