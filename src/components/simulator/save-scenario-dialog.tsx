"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSaveScenario } from "@/lib/queries/simulator";
import { describeParams } from "./describe-params";
import type { ScenarioParams, SimulationResult } from "@/lib/types";

export function SaveScenarioDialog({
  open,
  onOpenChange,
  params,
  result,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  params: ScenarioParams;
  result: SimulationResult;
}) {
  const [name, setName] = useState("");
  const save = useSaveScenario();
  const suggested = describeParams(params) || "Baseline";

  async function handleSave() {
    const finalName = name.trim() || suggested;
    try {
      await save.mutateAsync({ name: finalName, params, result });
      toast.success(`Saved “${finalName}”`);
      onOpenChange(false);
      setName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save scenario</DialogTitle>
          <DialogDescription>
            Keep this what-if so you can revisit it or compare it against others.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            autoFocus
            placeholder={suggested}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <p className="text-xs text-muted-foreground">{describeParams(params) || "No changes from baseline."}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            Save scenario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
