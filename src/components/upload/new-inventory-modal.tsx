"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shown after a new inventory file is imported while the user has an active
 * Copilot conversation. "Start New Analysis" opens a fresh conversation bound to
 * the new dataset; "Keep Current Conversation" leaves the old one in place (it
 * becomes read-only and is flagged as previous-inventory).
 */
export function NewInventoryModal({
  open,
  onOpenChange,
  onStartNew,
  onKeep,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartNew: () => void;
  onKeep: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Inventory Detected</DialogTitle>
          <DialogDescription>
            This inventory is different from the data used in your current Copilot conversation.
            Starting a new analysis is recommended.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onKeep} disabled={pending}>
            Keep Current Conversation
          </Button>
          <Button onClick={onStartNew} disabled={pending}>
            Start New Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
