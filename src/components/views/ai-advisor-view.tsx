"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfidenceMeter } from "@/components/shared/badges";
import { ChatSkeleton } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { postJSON } from "@/hooks/use-fetch";
import { toast } from "sonner";
import type { AdvisorInsight } from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  insight?: AdvisorInsight | null;
  pending?: boolean;
}

const QUICK_ACTIONS = [
  { label: "Prevent Stockouts", prompt: "What should I reorder this week to prevent stockouts?" },
  { label: "Protect Revenue", prompt: "Which products are at risk of causing revenue loss and how much is at stake?" },
  { label: "Predict Demand", prompt: "Predict demand for my top 3 products over the next 7 days." },
  { label: "Find Slow Movers", prompt: "Which products are overstocked or slow moving and tying up cash?" },
  { label: "Analyze Profit Opportunities", prompt: "Which products generate the most revenue and how can I grow profit?" },
];

const INITIAL_MESSAGE: Message = {
  id: "intro",
  role: "assistant",
  content:
    "Hi Sokchea 👋 I'm your Inventra AI copilot. Ask me what to reorder, which products are at risk, or what's overstocked — I'll give you data-backed answers with revenue impact and confidence scores.",
};

interface AdvisorResponse {
  reply: string;
  insight?: AdvisorInsight | null;
  createdAt: string;
}

export function AiAdvisorView() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(prompt: string) {
    const text = prompt.trim();
    if (!text || sending) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    const pendingId = `a-${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: pendingId, role: "assistant", content: "", pending: true }]);
    setInput("");
    setSending(true);

    const history = messages
      .filter((m) => !m.pending && m.id !== "intro")
      .map((m) => ({ role: m.role, content: m.content }));

    const { data, error } = await postJSON<AdvisorResponse>("/api/ai-advisor", {
      message: text,
      history,
    });

    setSending(false);
    if (error || !data) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingId
            ? {
                ...msg,
                pending: false,
                content: "I couldn't reach the AI engine right now. Please try again in a moment.",
              }
            : msg
        )
      );
      toast.error(error || "AI advisor unavailable");
      return;
    }
    setMessages((m) =>
      m.map((msg) =>
        msg.id === pendingId
          ? {
              ...msg,
              pending: false,
              content: data.reply,
              insight: data.insight,
            }
          : msg
      )
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-9rem)] animate-in-fade">
      <SectionHeading
        title="AI Advisor"
        description="Chat with your dedicated AI business analyst. Ask about reorders, risks, demand, and revenue."
        icon={Bot}
      />

      <Card className="flex min-h-0 flex-1 flex-col p-0 overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="border-t border-border bg-muted/30 px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => send(q.prompt)}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50 dark:hover:border-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
                >
                  <Sparkles className="size-3 text-teal-600" />
                  {q.label}
                </button>
              ))}
            </div>

            {/* Composer */}
            <div className="mt-3 flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask your AI copilot anything…"
                rows={1}
                className="min-h-[44px] max-h-32 resize-none bg-background"
              />
              <Button
                onClick={() => send(input)}
                disabled={!input.trim() || sending}
                className="h-11 shrink-0 bg-teal-600 text-white hover:bg-teal-700"
                size="lg"
              >
                <Send className="size-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Press Enter to send · Shift+Enter for a new line · AI responses include confidence scores & revenue impact.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  if (message.pending) {
    return (
      <div className="flex gap-3">
        <Avatar role="assistant" />
        <div className="flex-1 pt-1">
          <ChatSkeleton />
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar role={message.role} />
      <div className={cn("min-w-0 flex-1 space-y-3", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-teal-600 text-white rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          {message.content ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <span className="text-muted-foreground italic">No response.</span>
          )}
        </div>
        {message.insight && message.insight.items.length > 0 && (
          <InsightCard insight={message.insight} />
        )}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: AdvisorInsight }) {
  return (
    <div className="w-full rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-teal-600" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommended Actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Confidence</span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              insight.overallConfidence >= 80
                ? "text-emerald-600"
                : insight.overallConfidence >= 60
                ? "text-amber-600"
                : "text-red-600"
            )}
          >
            {insight.overallConfidence}%
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {insight.items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {i + 1}. {item.productName}
              </p>
              <span className="text-sm font-bold tabular-nums text-emerald-600">
                +{formatCurrency(item.revenueProtection)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
              <Metric label="Stock" value={`${item.stockRemaining}`} />
              <Metric label="Predicted stockout" value={item.predictedStockout} />
              <Metric label="Suggested order" value={`${item.suggestedOrder}`} />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Confidence</p>
                <div className="mt-1">
                  <ConfidenceMeter value={item.confidence} size="sm" />
                </div>
              </div>
            </div>
            {item.reasoning && (
              <p className="mt-2 text-xs text-muted-foreground">{item.reasoning}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "assistant") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm">
        <Bot className="size-4" />
      </div>
    );
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
      <User className="size-4" />
    </div>
  );
}
