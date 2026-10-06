import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, KeyRound, ShieldCheck, Handshake } from "lucide-react";
import { useMemo, useState } from "react";
import { ItemCard, ItemCardSkeleton } from "@/components/board/item-card";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ITEM_CATEGORIES, VENUE_GROUPS, venueLabel } from "@/lib/campus";
import { getCampusStats, listCampusBoard, type PublicItem } from "@/lib/lost-found/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [kind, setKind] = useState<"lost" | "found">("found");
  const [category, setCategory] = useState("all");
  const [venue, setVenue] = useState("all");
  const [q, setQ] = useState("");

  const stats = useQuery({ queryKey: ["campus-stats"], queryFn: () => getCampusStats() });
  const board = useQuery({
    queryKey: ["board", kind, category, venue, q],
    queryFn: () => listCampusBoard({ data: { kind, category, venue, q } }),
  });

  const items: PublicItem[] = board.data ?? [];
  const emptyHint = useMemo(() => {
    if (kind === "found") return "No active found notices match these filters.";
    return "No active lost notices match these filters.";
  }, [kind]);

  return (
    <AppShell>
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
            Vellore Institute of Technology
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.1] tracking-tight text-paper sm:text-5xl">
            Campus recovery, without the WhatsApp chaos.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted">
            Report missing or recovered items across official VIT landmarks. Ownership is
            verified in private. Returns happen at campus checkpoints — never over a
            published phone number.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/report"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-fg"
            >
              Report an item
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#boards"
              className="inline-flex h-12 items-center rounded-md border border-border px-5 text-sm font-medium text-fg hover:bg-elevated"
            >
              Browse the boards
            </a>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Lost open" value={stats.data?.activeLost} tone="lost" />
          <Stat label="Found open" value={stats.data?.activeFound} tone="found" />
          <Stat label="Returned" value={stats.data?.recovered} tone="accent" />
        </dl>
      </section>

      <ol className="mt-12 grid gap-3 sm:grid-cols-3">
        <Step
          icon={KeyRound}
          title="Post a campus notice"
          body="Tag the official landmark and category. Your registration number, email, and phone stay off the public board."
        />
        <Step
          icon={ShieldCheck}
          title="Private claim check"
          body="The finder sets a verification question. Claimants answer it. Identities stay hidden until a claim is approved."
        />
        <Step
          icon={Handshake}
          title="Handoff on campus"
          body="Approved pairs pick a checkpoint — SJT reception, library security, and other desks — then mark the return resolved."
        />
      </ol>

      <section id="boards" className="mt-14 scroll-mt-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl tracking-tight">Campus boards</h2>
            <p className="mt-1 text-sm text-muted">
              Separate Lost and Found feeds. Public cards never show who posted them.
            </p>
          </div>
          <div className="flex rounded-lg border border-border bg-surface p-1">
            {(["found", "lost"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "h-10 min-w-24 rounded-md px-4 text-sm font-medium capitalize transition-colors duration-150",
                  kind === k ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <form
          className="mt-6 grid gap-3 md:grid-cols-[1fr_180px_1fr]"
          onSubmit={(e) => e.preventDefault()}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles and details"
            aria-label="Search notices"
          />
          <NativeSelect
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category"
          >
            <option value="all">All categories</option>
            {ITEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            aria-label="Venue"
          >
            <option value="all">All VIT landmarks</option>
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
        </form>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {board.isPending
            ? Array.from({ length: 6 }).map((_, i) => <ItemCardSkeleton key={i} />)
            : null}
          {board.isError ? (
            <p className="col-span-full rounded-xl border border-border bg-surface p-6 text-sm text-danger">
              Could not load the campus board. Refresh and try again.
            </p>
          ) : null}
          {!board.isPending && !board.isError && items.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
              <p className="font-display text-2xl text-paper">{emptyHint}</p>
              <p className="mt-2 text-sm text-muted">
                Notices drop off the board automatically once either party marks them
                resolved.
              </p>
              <Link
                to="/report"
                className="mt-6 inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
              >
                Post a notice
              </Link>
            </div>
          ) : null}
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone: "lost" | "found" | "accent";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-2 font-display text-3xl tabular-nums tracking-tight text-fg">
        {value == null ? "—" : value}
      </dd>
      <Badge tone={tone} className="mt-3">
        Live
      </Badge>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof KeyRound;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-xl border border-border bg-surface p-5">
      <Icon className="size-5 text-accent" strokeWidth={1.7} />
      <h3 className="mt-4 font-display text-xl tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </li>
  );
}
