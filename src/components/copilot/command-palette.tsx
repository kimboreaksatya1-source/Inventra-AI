"use client";

import { useEffect, useRef } from "react";
import { CornerDownLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { cmdDescription, cmdTitle, type CopilotCommand } from "@/lib/copilot/commands";
import type { CopilotLanguage } from "@/lib/types";

export interface PaletteEntry {
  cmd: CopilotCommand;
  badge?: string;
  suggested?: boolean;
}

export function CommandPalette({
  entries,
  activeIndex,
  query,
  language,
  onHover,
  onSelect,
}: {
  entries: PaletteEntry[];
  activeIndex: number;
  query: string;
  language: CopilotLanguage;
  onHover: (i: number) => void;
  onSelect: (cmd: CopilotCommand) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // keep the active row in view during keyboard nav
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const suggested = entries.filter((e) => e.suggested);
  const rest = entries.filter((e) => !e.suggested);
  const q = query.replace(/^\//, "").toLowerCase();

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-30 mb-2"
      role="listbox"
      aria-label="Copilot commands"
    >
      <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div ref={listRef} className="max-h-[min(60vh,22rem)] overflow-y-auto p-1.5">
          {entries.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t(language, "cmd.noMatch")} “{query}”
            </p>
          )}

          {suggested.length > 0 && (
            <Section label={t(language, "cmd.suggested")}>
              {suggested.map((e) => (
                <Row
                  key={e.cmd.id}
                  entry={e}
                  q={q}
                  language={language}
                  active={entries.indexOf(e) === activeIndex}
                  index={entries.indexOf(e)}
                  onHover={onHover}
                  onSelect={onSelect}
                />
              ))}
            </Section>
          )}

          {rest.length > 0 && (
            <Section label={suggested.length > 0 ? t(language, "cmd.all") : t(language, "cmd.commands")}>
              {rest.map((e) => (
                <Row
                  key={e.cmd.id}
                  entry={e}
                  q={q}
                  language={language}
                  active={entries.indexOf(e) === activeIndex}
                  index={entries.indexOf(e)}
                  onHover={onHover}
                  onSelect={onSelect}
                />
              ))}
            </Section>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> {t(language, "cmd.navigate")}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>
              <CornerDownLeft className="size-3" />
            </Kbd>
            {t(language, "cmd.select")}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>esc</Kbd> {t(language, "cmd.dismiss")}
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({
  entry,
  q,
  language,
  active,
  index,
  onHover,
  onSelect,
}: {
  entry: PaletteEntry;
  q: string;
  language: CopilotLanguage;
  active: boolean;
  index: number;
  onHover: (i: number) => void;
  onSelect: (cmd: CopilotCommand) => void;
}) {
  const { cmd, badge, suggested } = entry;
  return (
    <button
      type="button"
      data-idx={index}
      role="option"
      aria-selected={active}
      onMouseEnter={() => onHover(index)}
      onMouseDown={(e) => e.preventDefault()} // keep textarea focus through the click
      onClick={() => onSelect(cmd)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors",
        active ? "bg-teal-50 dark:bg-teal-950/40" : "hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
          suggested
            ? "bg-teal-600 text-white"
            : "bg-muted text-muted-foreground"
        )}
      >
        {suggested ? <Sparkles className="size-3.5" /> : cmd.id.slice(1, 3)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-medium">{highlight(cmd.id, q)}</span>
          <span className="truncate text-sm font-medium">{cmdTitle(cmd, language)}</span>
          {badge && (
            <span className="ml-auto shrink-0 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
              {badge}
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {cmdDescription(cmd, language)}
        </span>
      </span>
    </button>
  );
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const bare = text.slice(1).toLowerCase();
  const at = bare.indexOf(q);
  if (at === -1) return text;
  const start = at + 1; // account for leading "/"
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-teal-200/70 text-inherit dark:bg-teal-800/70">
        {text.slice(start, start + q.length)}
      </mark>
      {text.slice(start + q.length)}
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.1rem] items-center justify-center rounded border border-border bg-background px-1 text-[10px] leading-none">
      {children}
    </kbd>
  );
}
