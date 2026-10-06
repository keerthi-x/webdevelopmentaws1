import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { type FormEvent, type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { REG_NUMBER_RE } from "@/lib/campus";
import { errorMessage } from "@/lib/lost-found/errors";
import { updateMyProfile } from "@/lib/lost-found/server";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [reg, setReg] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <div className="h-10 w-48 animate-pulse rounded-md bg-elevated" />
      </main>
    );
  }
  if (user) return <Navigate to="/" />;

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    if (!authEnabled) return;
    setBusy(true);
    try {
      if (mode === "up") {
        if (name.trim().length < 2) throw new Error("Enter the name you use on campus.");
        if (reg && !REG_NUMBER_RE.test(reg.trim())) {
          throw new Error("Use a VIT registration number such as 21BCE0123.");
        }
        const { error } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (error) throw new Error(error.message ?? "Could not create the account.");
        await updateMyProfile({
          data: {
            displayName: name.trim(),
            registrationNumber: reg.trim().toUpperCase(),
            phone: "",
          },
        });
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message ?? "Could not sign in.");
      }
      window.location.href = "/";
    } catch (err) {
      toast.error(errorMessage(err, "Could not complete sign-in."));
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh bg-bg px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_0%,color-mix(in_oklab,var(--color-accent)_16%,transparent),transparent)]" />
      <div className="relative mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <Wordmark />
          <h1 className="font-display text-4xl tracking-tight text-paper">
            Sign in to recover, claim, and return — privately.
          </h1>
          <p className="max-w-md text-muted">
            Public boards hide registration numbers, emails, and phones. Claims are
            reviewed only by the student who posted the notice.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-panel">
          <h2 className="font-display text-2xl tracking-tight">Campus access</h2>
          {authEnabled ? (
            <>
              <div className="mt-5 flex flex-col gap-2">
                {GROK_PROVIDERS.map((p) => (
                  <Button
                    key={p.providerId}
                    type="button"
                    variant="secondary"
                    onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                  >
                    Continue with {p.label}
                  </Button>
                ))}
              </div>
              <p className="my-5 text-center text-xs uppercase tracking-[0.18em] text-subtle">
                or email
              </p>
              <div className="mb-4 flex rounded-md border border-border p-1">
                {(["in", "up"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`h-9 flex-1 rounded-sm text-sm font-medium ${
                      mode === m ? "bg-elevated text-fg" : "text-muted"
                    }`}
                  >
                    {m === "in" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>
              <form className="space-y-3" onSubmit={onEmail}>
                {mode === "up" ? (
                  <>
                    <Field label="Name on campus">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        required
                      />
                    </Field>
                    <Field label="VIT registration number">
                      <Input
                        value={reg}
                        onChange={(e) => setReg(e.target.value.toUpperCase())}
                        placeholder="21BCE0123"
                        autoComplete="off"
                      />
                    </Field>
                  </>
                ) : null}
                <Field label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "up" ? "new-password" : "current-password"}
                    minLength={8}
                    required
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Working…" : mode === "up" ? "Create campus account" : "Sign in"}
                </Button>
              </form>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">Sign-in is disabled.</p>
          )}
          <p className="mt-5 text-center text-sm text-muted">
            <Link to="/" className="underline-offset-4 hover:text-fg hover:underline">
              Back to the boards
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
