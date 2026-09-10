import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** True only for the shared "Try Demo Instantly" account. */
      isDemo?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    /** Set by the `demo` Credentials provider's authorize(). */
    isDemo?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isDemo?: boolean;
  }
}
