import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { postedAt } from "@/lib/lost-found/dates";
import { errorMessage } from "@/lib/lost-found/errors";
import { decideClaim, getMyDesk, getMyProfile } from "@/lib/lost-found/server";

export const Route = createFileRoute("/desk")({ component: DeskPage });

function DeskPage() {
  const { user, isPending } = useCurrentUserState();
  const qc = useQueryClient();
  const desk = useQuery({
    queryKey: ["desk"],
    queryFn: () => getMyDesk(),
    enabled: Boolean(user),
  });
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => getMyProfile(),
    enabled: Boolean(user),
  });
  const decideMut = useMutation({
    mutationFn: (input: { claimId: string; decision: "approved" | "rejected" }) =>
      decideClaim({ data: input }),
    onSuccess: (res) => {
      toast.success(res.status === "approved" ? "Claim approved." : "Claim rejected.");
      void qc.invalidateQueries({ queryKey: ["desk"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isPending) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-elevated" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const pendingIncoming = desk.data?.incoming.filter((c) => c.status === "pending") ?? [];

  return (
    <AppShell>
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
        Private desk
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Your recoveries</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Review claim answers here. Claimants never see your identity. Approved pairs move
        to an in-app handoff thread.
      </p>

      {profile.data && !profile.data.registrationNumber ? (
        <div className="mt-6 rounded-xl border border-lost/30 bg-surface p-4 text-sm">
          <p className="text-fg">Add your VIT registration number on your profile.</p>
          <p className="mt-1 text-muted">
            It stays private — used only on your account, never on the public board.
          </p>
          <Link to="/profile" className="mt-3 inline-flex text-accent hover:underline">
            Complete profile
          </Link>
        </div>
      ) : null}

      {desk.isPending ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="h-40 animate-pulse rounded-xl bg-elevated" />
          <div className="h-40 animate-pulse rounded-xl bg-elevated" />
        </div>
      ) : null}
      {desk.isError ? (
        <p className="mt-8 text-sm text-danger">{errorMessage(desk.error)}</p>
      ) : null}

      {desk.data ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-2xl tracking-tight">Incoming claims</h2>
            <div className="mt-4 space-y-3">
              {pendingIncoming.length === 0 ? (
                <Empty>No pending claims to review.</Empty>
              ) : (
                pendingIncoming.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={c.itemKind === "lost" ? "lost" : "found"}>{c.itemKind}</Badge>
                      <span className="text-xs text-subtle tabular-nums">
                        {postedAt(c.createdAt)}
                      </span>
                    </div>
                    <Link
                      to="/items/$itemId"
                      params={{ itemId: c.itemId }}
                      className="mt-2 block font-display text-lg hover:text-paper"
                    >
                      {c.itemTitle}
                    </Link>
                    <p className="mt-2 text-sm text-fg">{c.answer}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        disabled={decideMut.isPending}
                        onClick={() =>
                          decideMut.mutate({ claimId: c.id, decision: "approved" })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={decideMut.isPending}
                        onClick={() =>
                          decideMut.mutate({ claimId: c.id, decision: "rejected" })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight">Your notices</h2>
            <div className="mt-4 space-y-3">
              {desk.data.reports.length === 0 ? (
                <Empty>
                  You have not posted a notice.{" "}
                  <Link to="/report" className="text-accent hover:underline">
                    Report an item
                  </Link>
                </Empty>
              ) : (
                desk.data.reports.map((item) => (
                  <Link
                    key={item.id}
                    to="/items/$itemId"
                    params={{ itemId: item.id }}
                    className="block rounded-xl border border-border bg-surface p-4 hover:border-accent/35"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={item.kind === "lost" ? "lost" : "found"}>{item.kind}</Badge>
                      {item.status === "resolved" ? (
                        <Badge tone="accent">Resolved</Badge>
                      ) : item.pendingClaims > 0 ? (
                        <Badge tone="lost">{item.pendingClaims} pending</Badge>
                      ) : (
                        <Badge>Active</Badge>
                      )}
                    </div>
                    <p className="mt-2 font-display text-lg">{item.title}</p>
                    <p className="mt-1 text-xs text-subtle tabular-nums">
                      {postedAt(item.createdAt)}
                    </p>
                    {item.approvedClaimId ? (
                      <span className="mt-2 inline-block text-sm text-accent">Handoff open</span>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="lg:col-span-2">
            <h2 className="font-display text-2xl tracking-tight">Claims you sent</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {desk.data.outgoing.length === 0 ? (
                <Empty>You have not claimed any notices yet.</Empty>
              ) : (
                desk.data.outgoing.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                    <Badge
                      tone={
                        c.status === "approved"
                          ? "accent"
                          : c.status === "rejected"
                            ? "danger"
                            : "muted"
                      }
                    >
                      {c.status}
                    </Badge>
                    <Link
                      to="/items/$itemId"
                      params={{ itemId: c.itemId }}
                      className="mt-2 block font-display text-lg hover:text-paper"
                    >
                      {c.itemTitle}
                    </Link>
                    {c.status === "approved" ? (
                      <Link
                        to="/handoff/$claimId"
                        params={{ claimId: c.id }}
                        className="mt-3 inline-flex h-11 items-center text-sm text-accent hover:underline"
                      >
                        Open handoff thread
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-sm text-muted">
      {children}
    </div>
  );
}
