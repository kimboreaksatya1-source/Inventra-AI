import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { LoginButton } from "@/components/auth/login-button";

export const metadata: Metadata = {
  title: "Sign in — Inventra AI",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/inventra-mark.png"
            alt="Inventra AI"
            width={444}
            height={521}
            priority
            className="h-10 w-auto"
          />
          <h1 className="text-xl font-semibold tracking-tight">
            Inventra<span className="text-teal-600"> AI</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Your AI Operating Copilot. Sign in to reach your business data.
          </p>
        </div>
        <Card className="gap-4 p-6">
          <LoginButton />
          <p className="text-center text-xs text-muted-foreground">
            We only use your Google account to identify you. Your business data stays private to
            your account.
          </p>
        </Card>
      </div>
    </div>
  );
}
