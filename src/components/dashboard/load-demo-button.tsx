"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadDemoData } from "@/lib/server-actions";

export function LoadDemoButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function run() {
    startTransition(async () => {
      const res = await loadDemoData();
      if (res.ok) {
        setDone(true);
        toast.success(`Loaded ${res.imported} demo products`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button variant="outline" onClick={run} disabled={pending || done} className="gap-2">
      <Sparkles className="size-4 text-teal-600" />
      {pending ? "Loading demo…" : done ? "Demo loaded" : "Load demo data"}
    </Button>
  );
}
