import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { HANDOFF_CHECKPOINTS, venueLabel } from "@/lib/campus";
import { postedAt } from "@/lib/lost-found/dates";
import { errorMessage } from "@/lib/lost-found/errors";
import {
  getHandoff,
  resolveItem,
  sendHandoffMessage,
  setMeetupCheckpoint,
} from "@/lib/lost-found/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/handoff/$claimId")({ component: HandoffPage });

function HandoffPage() {
  const { claimId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [body, setBody] = useState("");
  const [checkpoint, setCheckpoint] = useState<string>(HANDOFF_CHECKPOINTS[0]);

  const thread = useQuery({
    queryKey: ["handoff", claimId],
    queryFn: () => getHandoff({ data: claimId }),
    enabled: Boolean(user),
  });

  const sendMut = useMutation({
    mutationFn: () => sendHandoffMessage({ data: { claimId, body } }),
    onSuccess: (data) => {
      setBody("");
      qc.setQueryData(["handoff", claimId], data);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const meetupMut = useMutation({
    mutationFn: () =>
      setMeetupCheckpoint({
        data: { claimId, checkpoint: checkpoint as (typeof HANDOFF_CHECKPOINTS)[number] },
      }),
    onSuccess: (data) => {
      qc.setQueryData(["handoff", claimId], data);
      toast.success("Checkpoint saved.");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const resolveMut = useMutation({
    mutationFn: () => resolveItem({ data: { itemId: thread.data?.item.id ?? "" } }),
    onSuccess: () => {
      toast.success("Marked resolved. The notice has left the public boards.");
      void qc.invalidateQueries({ queryKey: ["board"] });
      void navigate({ to: "/desk" });
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

  const data = thread.data;
  const closed = data?.item.status === "resolved";

  return (
    <AppShell>
      {thread.isPending ? (
        <div className="h-64 animate-pulse rounded-xl bg-elevated" />
      ) : null}
      {thread.isError ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <h1 className="font-display text-3xl">Handoff unavailable</h1>
          <p className="mt-2 text-sm text-muted">{errorMessage(thread.error)}</p>
          <Link to="/desk" className="mt-6 inline-flex text-accent hover:underline">
            Back to your desk
          </Link>
        </div>
      ) : null}

      {data ? (
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="h-fit space-y-4 rounded-xl border border-border bg-surface p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              Private handoff
            </p>
            <h1 className="font-display text-3xl tracking-tight">{data.item.title}</h1>
            <div className="flex flex-wrap gap-2">
              <Badge tone={data.item.kind === "lost" ? "lost" : "found"}>{data.item.kind}</Badge>
              <Badge>{data.role === "finder" ? "You posted this" : "You claimed this"}</Badge>
            </div>
            <p className="text-sm text-muted">
              {venueLabel(data.item.venue)} · You are coordinating with the {data.otherLabel.toLowerCase()}.
              Names, phones, emails, and registration numbers stay off this thread unless you
              type them yourself.
            </p>
            <div className="space-y-2">
              <Label>Campus meetup checkpoint</Label>
              <p className="text-sm text-fg">
                {data.meetupCheckpoint ?? "Not chosen yet"}
              </p>
              {closed ? null : (
                <>
                  <NativeSelect
                    value={checkpoint}
                    onChange={(e) => setCheckpoint(e.target.value)}
                  >
                    {HANDOFF_CHECKPOINTS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={meetupMut.isPending}
                    onClick={() => meetupMut.mutate()}
                  >
                    {meetupMut.isPending ? "Saving…" : "Set checkpoint"}
                  </Button>
                </>
              )}
            </div>
            {closed ? (
              <Badge tone="accent">Resolved</Badge>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resolveMut.isPending}
                onClick={() => resolveMut.mutate()}
              >
                {resolveMut.isPending ? "Resolving…" : "Mark returned"}
              </Button>
            )}
          </aside>

          <section className="flex min-h-[28rem] flex-col rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-3 text-sm text-muted">
              In-app relay · {data.otherLabel}
            </div>
            <ul className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
              {data.messages.length === 0 ? (
                <li className="py-10 text-center text-sm text-muted">
                  No messages yet. Agree a checkpoint, then a time window.
                </li>
              ) : (
                data.messages.map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      m.from === "you"
                        ? "ml-auto bg-accent text-accent-fg"
                        : "bg-elevated text-fg",
                    )}
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] opacity-70">
                      {m.from === "you" ? "You" : data.otherLabel}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] tabular-nums opacity-70">
                      {postedAt(m.createdAt)}
                    </p>
                  </li>
                ))
              )}
            </ul>
            {closed ? (
              <p className="border-t border-border px-5 py-4 text-sm text-muted">
                This return is closed.
              </p>
            ) : (
              <form
                className="border-t border-border p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!body.trim()) return;
                  sendMut.mutate();
                }}
              >
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={500}
                  placeholder="Suggest a 10-minute window at the checkpoint. Do not share phone numbers."
                />
                <Button
                  type="submit"
                  className="mt-3"
                  disabled={sendMut.isPending || !body.trim()}
                >
                  {sendMut.isPending ? "Sending…" : "Send"}
                </Button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
