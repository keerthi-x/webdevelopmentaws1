import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errorMessage } from "@/lib/lost-found/errors";
import { getMyProfile, updateMyProfile } from "@/lib/lost-found/server";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, isPending } = useCurrentUserState();
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => getMyProfile(),
    enabled: Boolean(user),
  });
  const [displayName, setDisplayName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!profile.data) return;
    setDisplayName(profile.data.displayName);
    setRegistrationNumber(profile.data.registrationNumber);
    setPhone(profile.data.phone);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      updateMyProfile({
        data: { displayName, registrationNumber, phone },
      }),
    onSuccess: (data) => {
      qc.setQueryData(["profile"], data);
      toast.success("Profile saved. It is never shown on public listings.");
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
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Private profile
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Campus identity</h1>
        <p className="mt-2 text-sm text-muted">
          Registration number, email, and phone are stored on your account only. Public
          notices mask all three.
        </p>

        {profile.isPending ? (
          <div className="mt-8 h-48 animate-pulse rounded-xl bg-elevated" />
        ) : (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <label className="block space-y-1.5">
              <Label>Name on campus</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <Label>VIT registration number</Label>
              <Input
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                placeholder="21BCE0123"
              />
            </label>
            <label className="block space-y-1.5">
              <Label>Mobile (optional, never public)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                placeholder="10-digit number"
              />
            </label>
            {user.primaryEmail ? (
              <p className="text-xs text-subtle">Signed in as {user.primaryEmail}</p>
            ) : null}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save privately"}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
