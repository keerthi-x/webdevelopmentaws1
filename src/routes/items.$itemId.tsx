import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { venueLabel } from "@/lib/campus";
import { postedAt } from "@/lib/lost-found/dates";
import { errorMessage } from "@/lib/lost-found/errors";
import {
  decideClaim,
  getItemWorkspace,
  getPublicItem,
  submitClaim,
} from "@/lib/lost-found/server";

export const Route = createFileRoute("/items/$itemId")({ component: ItemPage });

function ItemPage() {
  const { itemId } = Route.useParams();
  const { user, isPending: sessionPending } = useCurrentUserState();
  const qc = useQueryClient();
  const [answer, setAnswer] = useState("");

  const publicItem = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => getPublicItem({ data: itemId }),
  });
  const workspace = useQuery({
    queryKey: ["item-workspace", itemId],
    queryFn: () => getItemWorkspace({ data: itemId }),
    enabled: Boolean(user),
  });

  const claimMut = useMutation({
    mutationFn: () => submitClaim({ data: { itemId, answer } }),
    onSuccess: () => {
      setAnswer("");
      toast.success("Claim sent. The reporter will review it in private.");
      void qc.invalidateQueries({ queryKey: ["item-workspace", itemId] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const decideMut = useMutation({
    mutationFn: (input: { claimId: string; decision: "approved" | "rejected" }) =>
      decideClaim({ data: input }),
    onSuccess: (res) => {
      toast.success(res.status === "approved" ? "Claim approved." : "Claim rejected.");
      void qc.invalidateQueries({ queryKey: ["item-workspace", itemId] });
      void qc.invalidateQueries({ queryKey: ["desk"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const item = workspace.data?.item ?? publicItem.data ?? null;
  const loading = publicItem.isPending || (Boolean(user) && workspace.isPending) || sessionPending;

  return (
    <AppShell>
      {loading ? (
        <div className="space-y-4">
          <div className="h-8 w-40 animate-pulse rounded bg-elevated" />
          <div className="h-12 w-2/3 animate-pulse rounded bg-elevated" />
          <div className="h-40 animate-pulse rounded-xl bg-elevated" />
        </div>
      ) : null}

      {!loading && !item ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <h1 className="font-display text-3xl">Notice not found</h1>
          <p className="mt-2 text-sm text-muted">It may have been resolved and left the board.</p>
          <Link
            to="/"
            className="mt-6 inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
          >
            Return to boards
          </Link>
        </div>
      ) : null}

      {item ? (
        <article className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={item.kind === "lost" ? "lost" : "found"}>{item.kind}</Badge>
              <Badge>{item.category}</Badge>
              {item.status === "resolved" ? <Badge tone="accent">Resolved</Badge> : null}
            </div>
            <h1 className="mt-4 font-display text-4xl tracking-tight text-paper">{item.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {venueLabel(item.venue)}
              </span>
              <span className="tabular-nums">{postedAt(item.createdAt)}</span>
            </p>
            <p className="mt-6 text-base leading-relaxed text-fg">{item.description}</p>
            <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              Reporter identity, registration number, email, and phone are hidden on this
              public notice.
            </p>
          </div>

          <aside className="h-fit rounded-xl border border-border bg-surface p-5 shadow-panel">
            {workspace.data?.isReporter ? (
              <ReporterPanel
                incoming={workspace.data.incoming}
                busy={decideMut.isPending}
                onDecide={(claimId, decision) => decideMut.mutate({ claimId, decision })}
              />
            ) : workspace.data?.myClaim ? (
              <ClaimStatusPanel claim={workspace.data.myClaim} />
            ) : item.status === "resolved" ? (
              <p className="text-sm text-muted">This item has already been returned.</p>
            ) : user ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  claimMut.mutate();
                }}
              >
                <h2 className="font-display text-2xl tracking-tight">Claim verification</h2>
                <p className="text-sm text-muted">
                  Answer the reporter’s question. They will see your answer — not your
                  phone number.
                </p>
                <p className="rounded-md bg-elevated px-3 py-2 text-sm text-fg">
                  {item.verificationChallenge}
                </p>
                <label className="block space-y-1.5">
                  <Label>Your answer</Label>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    maxLength={400}
                    required
                  />
                </label>
                <Button type="submit" className="w-full" disabled={claimMut.isPending}>
                  {claimMut.isPending ? "Sending claim…" : "Submit claim"}
                </Button>
              </form>
            ) : (
              <div className="space-y-3">
                <h2 className="font-display text-2xl tracking-tight">Claim this item</h2>
                <p className="text-sm text-muted">
                  Sign in to answer the verification challenge. The reporter’s identity
                  stays hidden.
                </p>
                <Button asChild className="w-full">
                  <Link to="/login">Sign in to claim</Link>
                </Button>
              </div>
            )}
          </aside>
        </article>
      ) : null}
    </AppShell>
  );
}

function ReporterPanel({
  incoming,
  busy,
  onDecide,
}: {
  incoming: {
    id: string;
    answer: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
  }[];
  busy: boolean;
  onDecide: (claimId: string, decision: "approved" | "rejected") => void;
}) {
  const pending = incoming.filter((c) => c.status === "pending");
  const decided = incoming.filter((c) => c.status !== "pending");
  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl tracking-tight">Your desk</h2>
      <p className="text-sm text-muted">
        Claimants cannot see who you are. Approve only if the answer proves ownership.
      </p>
      {incoming.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-sm text-muted">
          No claims yet.
        </p>
      ) : null}
      {pending.map((c) => (
        <div key={c.id} className="rounded-lg border border-border bg-elevated p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">
            Pending · {postedAt(c.createdAt)}
          </p>
          <p className="mt-2 text-sm text-fg">{c.answer}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => onDecide(c.id, "approved")}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => onDecide(c.id, "rejected")}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
      {decided.map((c) => (
        <div key={c.id} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <Badge tone={c.status === "approved" ? "accent" : "danger"}>{c.status}</Badge>
            {c.status === "approved" ? (
              <Link
                to="/handoff/$claimId"
                params={{ claimId: c.id }}
                className="text-sm text-accent hover:underline"
              >
                Open handoff
              </Link>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted">{c.answer}</p>
        </div>
      ))}
    </div>
  );
}

function ClaimStatusPanel({
  claim,
}: {
  claim: { id: string; status: string };
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-2xl tracking-tight">Your claim</h2>
      <Badge
        tone={
          claim.status === "approved" ? "accent" : claim.status === "rejected" ? "danger" : "muted"
        }
      >
        {claim.status}
      </Badge>
      {claim.status === "pending" ? (
        <p className="text-sm text-muted">
          Waiting on the reporter. You still cannot see their identity.
        </p>
      ) : null}
      {claim.status === "rejected" ? (
        <p className="text-sm text-muted">
          This answer was rejected. You may submit a clearer claim from this page after
          refreshing.
        </p>
      ) : null}
      {claim.status === "approved" ? (
        <>
          <p className="text-sm text-muted">
            Approved. Coordinate a campus checkpoint in the private thread — still no phone
            numbers.
          </p>
          <Button asChild className="w-full">
            <Link to="/handoff/$claimId" params={{ claimId: claim.id }}>
              Open handoff thread
            </Link>
          </Button>
        </>
      ) : null}
    </div>
  );
}
