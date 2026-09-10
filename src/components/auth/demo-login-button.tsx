"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoLoginButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="lg"
      variant="outline"
      className="w-full gap-2"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void signIn("demo", { redirectTo: "/" });
      }}
    >
      <Sparkles className="size-4 text-teal-600" />
      {loading ? "Loading demo…" : "Try Demo Instantly"}
    </Button>
  );
}
