import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ITEM_CATEGORIES, VENUE_GROUPS, venueLabel, type ItemKind } from "@/lib/campus";
import { errorMessage } from "@/lib/lost-found/errors";
import { createReport } from "@/lib/lost-found/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/report")({ component: ReportPage });

function ReportPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [kind, setKind] = useState<ItemKind>("found");
  const [category, setCategory] = useState<(typeof ITEM_CATEGORIES)[number]>("ID Cards");
  const [venue, setVenue] = useState("SJT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [challenge, setChallenge] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createReport({
        data: {
          kind,
          category,
          venue,
          title,
          description,
          verificationChallenge: challenge,
        },
      }),
    onSuccess: (res) => {
      toast.success("Notice posted. It is live on the campus board.");
      void navigate({ to: "/items/$itemId", params: { itemId: res.id } });
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

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          New campus notice
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Report lost or found</h1>
        <p className="mt-2 text-sm text-muted">
          Your name, registration number, email, and phone never appear on the public
          card. Claimants only see the verification question you set.
        </p>

        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  id: "found" as const,
                  title: "I found this",
                  body: "Hold it safely and set a question only the owner can answer.",
                },
                {
                  id: "lost" as const,
                  title: "I lost this",
                  body: "Ask a detail a finder would notice, so fake claims fail.",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setKind(opt.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors duration-150",
                  kind === opt.id
                    ? "border-accent/50 bg-elevated"
                    : "border-border bg-surface hover:border-border",
                )}
              >
                <span className="font-display text-xl tracking-tight">{opt.title}</span>
                <span className="mt-1 block text-sm text-muted">{opt.body}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <Label>Category</Label>
              <NativeSelect
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as (typeof ITEM_CATEGORIES)[number])
                }
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="space-y-1.5">
              <Label>Campus landmark</Label>
              <NativeSelect value={venue} onChange={(e) => setVenue(e.target.value)}>
                {VENUE_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.venues.map((v) => (
                      <option key={v} value={v}>
                        {venueLabel(v)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
            </label>
          </div>

          <label className="block space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Blue VIT ID near TT lift lobby"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <Label>What to look for — no phone numbers</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={800}
              placeholder="Where it was last seen, unique marks, colour. Do not include your mobile number."
              required
            />
          </label>

          <label className="block space-y-1.5">
            <Label>Verification challenge</Label>
            <Textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              maxLength={200}
              placeholder="What name and branch are printed on the ID tag?"
              required
            />
            <p className="text-xs text-subtle">
              Claimants must answer this. You approve or reject in private on your desk.
            </p>
          </label>

          {mutation.isError ? (
            <p className="text-sm text-danger">{errorMessage(mutation.error)}</p>
          ) : null}

          <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
            {mutation.isPending ? "Posting notice…" : "Post to campus board"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
