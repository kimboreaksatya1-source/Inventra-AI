"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="lg"
      className="w-full gap-3"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void signIn("google", { redirectTo: "/" });
      }}
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path
          fill="currentColor"
          d="M12.24 10.4v3.83h5.44c-.24 1.4-1.66 4.1-5.44 4.1-3.27 0-5.94-2.7-5.94-6.03s2.67-6.03 5.94-6.03c1.86 0 3.11.79 3.82 1.48l2.6-2.5C16.9 3.15 14.8 2.2 12.24 2.2 6.9 2.2 2.6 6.5 2.6 12s4.3 9.8 9.64 9.8c5.56 0 9.24-3.91 9.24-9.42 0-.63-.07-1.12-.16-1.6z"
        />
      </svg>
      {loading ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
