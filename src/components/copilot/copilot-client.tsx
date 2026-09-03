"use client";

import { useEffect, useState } from "react";
import { PanelLeft, PanelRight } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import {
  useCreateSession,
  useSessions,
  useSetSessionLanguage,
} from "@/lib/queries/copilot";
import { useCopilotChat } from "@/hooks/use-copilot-chat";
import type { CopilotLanguage } from "@/lib/types";
import { ConversationList } from "./conversation-list";
import { ChatThread } from "./chat-thread";
import { Composer } from "./composer";
import { ContextPanel } from "./context-panel";
import { LanguageToggle } from "./language-toggle";

const LANG_KEY = "inventra.copilot.lang";

export function CopilotClient() {
  const [language, setLanguageState] = useState<CopilotLanguage>("en");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const { data: sessions } = useSessions();
  const createSession = useCreateSession();
  const setSessionLang = useSetSessionLanguage();
  const chat = useCopilotChat({ sessionId: activeId, language });

  useEffect(() => {
    try {
      const v = localStorage.getItem(LANG_KEY);
      if (v === "en" || v === "km") setLanguageState(v);
    } catch {
      /* ignore */
    }
  }, []);

  // The Copilot workspace owns the viewport: only the message list scrolls, the
  // page itself never does. Restored on navigation away.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (activeId === null && sessions && sessions.length > 0) {
      setActiveId(sessions[0].id);
    }
  }, [sessions, activeId]);

  function setLanguage(l: CopilotLanguage) {
    setLanguageState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
    if (activeId) setSessionLang.mutate({ id: activeId, language: l });
  }

  async function handleSend(text: string) {
    let sid = activeId;
    if (!sid) {
      const res = await createSession.mutateAsync(language);
      sid = res.session.id;
      setActiveId(sid);
    }
    void chat.send(text, sid);
  }

  async function handleNew() {
    const res = await createSession.mutateAsync(language);
    setActiveId(res.session.id);
    setLeftOpen(false);
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setLeftOpen(false);
  }

  function handleDeleted(id: string) {
    if (id === activeId) setActiveId(null);
  }

  const listProps = {
    language,
    activeId,
    onSelect: handleSelect,
    onNew: handleNew,
    onDeleted: handleDeleted,
  };

  return (
    <div className="grid h-[calc(100dvh-4rem)] grid-cols-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)_340px]">
      {/* Left — desktop */}
      <aside className="hidden min-h-0 border-r border-border lg:block">
        <ConversationList {...listProps} />
      </aside>

      {/* Center */}
      <section className="flex min-h-0 min-w-0 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 lg:hidden">
          <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t(language, "copilot.history")}>
                <PanelLeft className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">{t(language, "copilot.history")}</SheetTitle>
              <ConversationList {...listProps} />
            </SheetContent>
          </Sheet>

          <LanguageToggle value={language} onChange={setLanguage} />

          <Sheet open={rightOpen} onOpenChange={setRightOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t(language, "copilot.context")}>
                <PanelRight className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto p-0">
              <SheetTitle className="sr-only">{t(language, "copilot.context")}</SheetTitle>
              <ContextPanel language={language} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop header */}
        <div className="hidden items-center justify-between border-b border-border px-6 py-2.5 lg:flex">
          <div>
            <h1 className="text-sm font-semibold">{t(language, "copilot.title")}</h1>
            <p className="text-xs text-muted-foreground">{t(language, "copilot.subtitle")}</p>
          </div>
          <LanguageToggle value={language} onChange={setLanguage} />
        </div>

        <ChatThread
          messages={chat.messages}
          language={language}
          isStreaming={chat.isStreaming}
          onQuickAction={handleSend}
        />

        {chat.error && (
          <div className="px-4">
            <p className="mx-auto max-w-4xl pb-1 text-xs text-red-600 dark:text-red-400">
              {chat.error}
            </p>
          </div>
        )}

        <Composer
          language={language}
          isStreaming={chat.isStreaming}
          onSend={handleSend}
          onStop={chat.stop}
        />
      </section>

      {/* Right — desktop */}
      <aside className="hidden min-h-0 border-l border-border lg:block">
        <ContextPanel language={language} />
      </aside>
    </div>
  );
}
