import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      {/* Ambient wash. Purely decorative, so it is hidden from assistive tech. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% -10%, var(--accent), transparent 55%), radial-gradient(50rem 35rem at 110% 110%, var(--accent), transparent 55%)",
          filter: "saturate(0.7)",
        }}
      />

      <FadeIn className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="accent-bg mx-auto mb-4 flex size-12 items-center justify-center rounded-xl text-lg font-bold shadow-lg">
            BI
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Blog Inventory
          </h1>
          <p className="text-muted mt-1 text-sm">
            Multi-branch stock and announcements
          </p>
        </div>

        <Card className="p-6">
          <LoginForm />
        </Card>

        <p className="text-muted mt-6 text-center text-xs leading-relaxed">
          Demo accounts — <span className="font-medium">admin</span>,{" "}
          <span className="font-medium">branch</span>,{" "}
          <span className="font-medium">worker</span>
          <br />
          password <span className="font-medium">demo1234</span>
        </p>
      </FadeIn>
    </main>
  );
}
