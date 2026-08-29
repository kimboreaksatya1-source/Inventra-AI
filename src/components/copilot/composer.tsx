"use client";

import { useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import type { CopilotLanguage } from "@/lib/types";

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
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = value.trim();
    if (!text || isStreaming || disabled) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => ref.current?.focus());
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-teal-400">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
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
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          {t(language, "copilot.hintLine")}
        </p>
      </div>
    </div>
  );
}
