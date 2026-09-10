import { Sparkles } from "lucide-react";

/**
 * Shown to the shared demo account in place of any "load / import / replace
 * inventory" control. The demo catalog is fixed and already loaded, so these
 * actions do not apply.
 */
export function DemoModeBadge({ className }: { className?: string }) {
  return (
    <div
      className={
        "inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/60 px-3 py-1.5 text-xs font-medium text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-300 " +
        (className ?? "")
      }
    >
      <Sparkles className="size-3.5" />
      Demo Mode — Sample inventory loaded
    </div>
  );
}
