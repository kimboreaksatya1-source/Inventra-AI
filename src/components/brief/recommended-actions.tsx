import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriorityBadge } from "@/components/shared/badges";
import type { RecommendedAction } from "@/lib/types";

const RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export function RecommendedActions({ actions }: { actions: RecommendedAction[] }) {
  const ordered = [...actions].sort((a, b) => RANK[a.priority] - RANK[b.priority]);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Priority</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Expected Impact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((a, i) => (
            <TableRow key={i} className="align-top">
              <TableCell className="py-3">
                <PriorityBadge priority={a.priority} />
              </TableCell>
              <TableCell className="py-3 font-medium">{a.action}</TableCell>
              <TableCell className="py-3 text-sm text-muted-foreground whitespace-normal">
                {a.reason}
              </TableCell>
              <TableCell className="py-3 text-sm whitespace-normal">{a.expectedImpact}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
