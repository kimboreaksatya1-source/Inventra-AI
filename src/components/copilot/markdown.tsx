"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Assistant markdown, styled to the Inventra design system. No raw HTML. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("text-sm leading-7 text-foreground/90 [&>*:first-child]:mt-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="mt-4 mb-2 text-base font-semibold text-foreground">{children}</h3>,
          h2: ({ children }) => <h3 className="mt-4 mb-2 text-base font-semibold text-foreground">{children}</h3>,
          h3: ({ children }) => <h3 className="mt-4 mb-2 text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">{children}</h3>,
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-2">{children}</ol>,
          li: ({ children }) => <li className="pl-1 marker:text-muted-foreground">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-teal-600 underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-[13px] font-mono">{children}</code>
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border-t border-border px-3 py-2">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
