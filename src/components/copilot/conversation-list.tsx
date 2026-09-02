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
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { useDeleteSession, useSessions } from "@/lib/queries/copilot";
import type { CopilotLanguage } from "@/lib/types";

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
        <ul className="space-y-0.5">
          {sessions?.map((s) => (
            <li key={s.id} className="group relative">
              <button
                onClick={() => onSelect(s.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 pr-8 text-left transition-colors",
                  activeId === s.id
                    ? "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200"
                    : "hover:bg-muted"
                )}
              >
                <p className="truncate text-sm font-medium">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {relativeTime(s.updatedAt)} · {s.messageCount}
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
                      onClick={async () => {
                        await del.mutateAsync(s.id);
                        onDeleted(s.id);
                      }}
                    >
                      {t(language, "copilot.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
