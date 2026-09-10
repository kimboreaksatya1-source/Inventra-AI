import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LoginButton } from "@/components/auth/login-button";
import { DEMO_READ_ONLY_MESSAGE } from "@/lib/auth-helpers";

/**
 * Shown on /upload for the shared demo account in place of the import wizard.
 * The API routes enforce the same rule server-side — this is the explanation.
 */
export function DemoUploadNotice() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import your business data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring your own product export to get an analysis of your real inventory.
        </p>
      </div>

      <Card className="items-start gap-4 p-6">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Lock className="size-6" />
        </div>
        <div className="w-full">
          <h2 className="text-lg font-semibold">Import is disabled in demo mode</h2>
          <p className="mt-1 text-sm text-muted-foreground">{DEMO_READ_ONLY_MESSAGE}</p>
        </div>
        <div className="w-full sm:w-fit">
          <LoginButton />
        </div>
      </Card>
    </div>
  );
}
