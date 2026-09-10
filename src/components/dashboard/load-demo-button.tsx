"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadDemoData } from "@/lib/server-actions";

export function LoadDemoButton({
  size,
  label = "Load demo data",
  className,
}: {
  size?: "default" | "sm" | "lg";
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function run() {
    startTransition(async () => {
      const res = await loadDemoData();
      if (res.ok) {
        setDone(true);
        toast.success(`Loaded ${res.imported} demo products`);
        // Every page reads its data through React Query; router.refresh() only
        // re-runs RSC, so without this the Copilot / Brief / etc. keep their
        // pre-demo cached responses (and their empty states) until staleTime.
        await qc.invalidateQueries();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={run}
      disabled={pending || done}
      className={cn("gap-2", className)}
    >
      <Sparkles className="size-4 text-teal-600" />
      {pending ? "Loading demo…" : done ? "Demo loaded" : label}
    </Button>
  );
}
