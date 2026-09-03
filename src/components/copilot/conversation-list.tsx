"use client";

import { MessageSquarePlus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { UpgradeCard } from "@/components/pricing/upgrade-card";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { useDeleteSession, useSessions } from "@/lib/queries/copilot";
import type { ChatSessionSummary, CopilotLanguage } from "@/lib/types";

const LEGACY = "__legacy__";

/** Group by inventory dataset, newest dataset first, legacy conversations last. */
function groupByDataset(sessions: ChatSessionSummary[]) {
  const groups = new Map<
    string,
    { name: string; uploadedAt: string | null; productCount: number | null; sessions: ChatSessionSummary[] }
  >();
  for (const s of sessions) {
    const key = s.datasetId ?? LEGACY;
    if (!groups.has(key)) {
      groups.set(key, {
        name: s.datasetName ?? "Earlier conversations",
        uploadedAt: s.datasetUploadedAt,
        productCount: s.datasetProductCount,
        sessions: [],
      });
    }
    groups.get(key)!.sessions.push(s);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => {
      if (a.key === LEGACY) return 1;
      if (b.key === LEGACY) return -1;
      return (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? "");
    });
}

export function ConversationList({
  language,
  activeId,
  onSelect,
  onNew,
  onDeleted,
}: {
  language: CopilotLanguage;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleted: (id: string) => void;
}) {
  const { data: sessions, isLoading } = useSessions();
  const del = useDeleteSession();
  const groups = sessions ? groupByDataset(sessions) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button variant="outline" className="w-full justify-start" onClick={onNew}>
          <MessageSquarePlus className="size-4" />
          {t(language, "copilot.newChat")}
        </Button>
      </div>
      <p className="px-4 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t(language, "copilot.history")}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isLoading && (
          <div className="space-y-2 px-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}
        {!isLoading && (sessions?.length ?? 0) === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {t(language, "copilot.newChat")} →
          </p>
        )}

        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="flex items-baseline justify-between gap-2 px-2 pb-1">
                <p className="truncate text-[11px] font-semibold text-foreground/80" title={g.name}>
                  {g.name}
                </p>
                {g.key !== LEGACY && (
                  <p className="shrink-0 text-[10px] text-muted-foreground">
                    {g.productCount != null ? `${g.productCount} products` : ""}
                    {g.uploadedAt ? ` · ${relativeTime(g.uploadedAt)}` : ""}
                  </p>
                )}
              </div>
              <ul className="space-y-0.5">
                {g.sessions.map((s) => (
                  <ConversationRow
                    key={s.id}
                    session={s}
                    active={activeId === s.id}
                    language={language}
                    onSelect={() => onSelect(s.id)}
                    onDelete={async () => {
                      await del.mutateAsync(s.id);
                      onDeleted(s.id);
                    }}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border p-3">
        <UpgradeCard />
      </div>
    </div>
  );
}

function ConversationRow({
  session: s,
  active,
  language,
  onSelect,
  onDelete,
}: {
  session: ChatSessionSummary;
  active: boolean;
  language: CopilotLanguage;
  onSelect: () => void;
  onDelete: () => void | Promise<void>;
}) {
  return (
    <li className="group relative">
      <button
        onClick={onSelect}
        className={cn(
          "w-full rounded-lg px-3 py-2 pr-8 text-left transition-colors",
          active
            ? "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200"
            : "hover:bg-muted"
        )}
      >
        <p className="truncate text-sm font-medium">{s.title}</p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>
            {relativeTime(s.updatedAt)} · {s.messageCount}
          </span>
          {s.stale && (
            <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              previous inventory
            </span>
          )}
        </p>
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-red-600 group-hover:block"
            aria-label={t(language, "copilot.delete")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(language, "copilot.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(language, "copilot.deleteConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(language, "copilot.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={onDelete}
            >
              {t(language, "copilot.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
