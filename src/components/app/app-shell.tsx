import Link from "next/link";
import { Sparkles } from "lucide-react";
import { FlowNav } from "./flow-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  /** Full-bleed content: no max-width, no padding, no footer (for the Copilot workspace). */
  bleed = false,
}: {
  children: React.ReactNode;
  bleed?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Sparkles className="size-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              Inventra<span className="text-teal-600"> AI</span>
            </span>
          </Link>
          <FlowNav />
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>

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
