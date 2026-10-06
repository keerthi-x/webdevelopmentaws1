import { Link } from "@tanstack/react-router";
import {
  Calculator,
  CreditCard,
  FlaskConical,
  Headphones,
  KeyRound,
  MapPin,
  Wallet,
} from "lucide-react";
import { venueLabel } from "@/lib/campus";
import { postedAt } from "@/lib/lost-found/dates";
import type { PublicItem } from "@/lib/lost-found/server";
import { Badge } from "@/components/ui/badge";

const ICONS = {
  "ID Cards": CreditCard,
  "Room Keys": KeyRound,
  Calculators: Calculator,
  "Lab Equipment": FlaskConical,
  Earphones: Headphones,
  Wallets: Wallet,
} as const;

export function ItemCard({ item }: { item: PublicItem }) {
  const Icon = ICONS[item.category as keyof typeof ICONS] ?? CreditCard;
  return (
    <Link
      to="/items/$itemId"
      params={{ itemId: item.id }}
      className="group flex flex-col rounded-xl border border-border bg-surface p-4 shadow-panel transition-[border-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-accent/35"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-elevated text-accent">
          <Icon className="size-5" strokeWidth={1.7} />
        </div>
        <Badge tone={item.kind === "lost" ? "lost" : "found"}>{item.kind}</Badge>
      </div>
      <h3 className="mt-4 font-display text-xl leading-snug tracking-tight text-fg group-hover:text-paper">
        {item.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted">{item.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {venueLabel(item.venue)}
        </span>
        <span>{item.category}</span>
        <span className="tabular-nums">{postedAt(item.createdAt)}</span>
      </div>
    </Link>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex justify-between">
        <div className="size-10 animate-pulse rounded-lg bg-elevated" />
        <div className="h-5 w-14 animate-pulse rounded-full bg-elevated" />
      </div>
      <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-elevated" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-elevated" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-elevated" />
    </div>
  );
}
