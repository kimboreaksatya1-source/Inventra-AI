import Link from "next/link";
import Image from "next/image";
import { FlowNav } from "./flow-nav";
import { UserMenu } from "@/components/auth/user-menu";
import { DemoWelcomeGate } from "@/components/demo/demo-welcome-gate";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";

export async function AppShell({
  children,
  /** Full-bleed content: no max-width, no padding, no footer (for the Copilot workspace). */
  bleed = false,
}: {
  children: React.ReactNode;
  bleed?: boolean;
}) {
  const session = await auth();
  const isDemo = session?.user?.isDemo === true;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/inventra-mark.png"
              alt="Inventra AI"
              width={444}
              height={521}
              priority
              className="h-8 w-auto"
            />
            <span className="hidden text-base font-semibold tracking-tight sm:inline">
              Inventra<span className="text-teal-600"> AI</span>
            </span>
          </Link>
          <FlowNav isDemo={isDemo} />
          <div className="flex shrink-0 items-center gap-1.5">
            {session?.user ? <UserMenu user={session.user} /> : null}
          </div>
        </div>
      </header>

      {isDemo && (
        <div className="border-b border-teal-200 bg-teal-50/70 px-4 py-1.5 text-center text-xs text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200 sm:px-6">
          <span className="font-medium">Demo Mode</span>
          <span className="mx-1.5 opacity-50">•</span>
          Sample data — Phnom Penh Mini-Mart
          <span className="mx-1.5 opacity-50">•</span>
          <Link href="/login" className="font-medium underline underline-offset-2 hover:no-underline">
            Sign in with Google
          </Link>
        </div>
      )}

      {isDemo && <DemoWelcomeGate isDemo />}

      <main
        className={cn(
          "flex-1",
          !bleed && "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
        )}
      >
        {children}
      </main>

      {!bleed && (
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <p>© {new Date().getFullYear()} Inventra AI — Your AI Operating Copilot.</p>
            <p>Upload · Analyze · Decide</p>
          </div>
        </footer>
      )}
    </div>
  );
}
