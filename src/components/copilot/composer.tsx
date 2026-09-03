"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Slash, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useCopilotContext } from "@/lib/queries/copilot";
import {
  filterCommands,
  suggestedCommands,
  type CopilotCommand,
} from "@/lib/copilot/commands";
import type { CopilotLanguage } from "@/lib/types";
import { CommandPalette, type PaletteEntry } from "./command-palette";

const SLASH_RE = /^\/[\w-]*$/;

export function Composer({
  language,
  isStreaming,
  disabled,
  onSend,
  onStop,
}: {
  language: CopilotLanguage;
  isStreaming: boolean;
  disabled?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const { data: context } = useCopilotContext();

  const paletteOpen =
    !isStreaming && !disabled && !dismissed && SLASH_RE.test(value);

  const entries: PaletteEntry[] = useMemo(() => {
    if (!paletteOpen) return [];
    const matches = filterCommands(value);
    const matchIds = new Set(matches.map((c) => c.id));

    const suggestedEntries: PaletteEntry[] = suggestedCommands(context, language)
      .filter((s) => matchIds.has(s.cmd.id))
      .map((s) => ({ cmd: s.cmd, badge: s.badge, suggested: true }));
    const suggestedIds = new Set(suggestedEntries.map((e) => e.cmd.id));

    const restEntries: PaletteEntry[] = matches
      .filter((c) => !suggestedIds.has(c.id))
      .map((c) => ({ cmd: c }));

    return [...suggestedEntries, ...restEntries];
  }, [paletteOpen, value, context, language]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  // ChatGPT-style auto-grow: expand the textarea with its content, capped at
  // ~7 lines (matches the max-h-40 class), then it scrolls internally.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function selectCommand(cmd: CopilotCommand) {
    setDismissed(true);
    if (cmd.autoSubmit && !isStreaming && !disabled) {
      onSend(cmd.prompt);
      setValue("");
      setDismissed(false);
    } else {
      setValue(cmd.prompt);
    }
    requestAnimationFrame(() => ref.current?.focus());
  }

  function submit() {
    const text = value.trim();
    if (!text || isStreaming || disabled) return;
    onSend(text);
    setValue("");
    setDismissed(false);
    requestAnimationFrame(() => ref.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (paletteOpen && entries.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % entries.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + entries.length) % entries.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectCommand(entries[Math.min(activeIndex, entries.length - 1)].cmd);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(true);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3 sm:px-6">
      <div className="relative mx-auto max-w-4xl">
        {paletteOpen && (
          <CommandPalette
            entries={entries}
            activeIndex={activeIndex}
            query={value}
            language={language}
            onHover={setActiveIndex}
            onSelect={selectCommand}
          />
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-teal-400">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setDismissed(false);
            }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={t(language, "copilot.placeholder")}
            disabled={disabled}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          {isStreaming ? (
            <Button size="icon" variant="secondary" onClick={onStop} aria-label={t(language, "copilot.stop")}>
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={submit}
              disabled={!value.trim() || disabled}
              aria-label={t(language, "copilot.send")}
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <Slash className="size-3" />
          {t(language, "cmd.hint")} · {t(language, "copilot.hintLine")}
        </p>
      </div>
    </div>
  );
}
