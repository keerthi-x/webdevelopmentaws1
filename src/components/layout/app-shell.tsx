import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Inbox, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Wordmark } from "./wordmark";

const NAV = [
  { to: "/", label: "Boards", icon: ClipboardList, match: "exact" as const },
  { to: "/report", label: "Report", icon: Plus, match: "prefix" as const },
  { to: "/desk", label: "Desk", icon: Inbox, match: "prefix" as const },
];

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-24 animate-pulse rounded-full bg-elevated" />;
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex h-11 items-center rounded-md border border-border px-3 text-sm font-medium text-fg hover:bg-elevated"
      >
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Link
        to="/profile"
        className="hidden text-sm text-muted hover:text-fg sm:inline"
      >
        Profile
      </Link>
      <UserButton />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Wordmark compact />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.match === "exact"
                  ? pathname === item.to
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors duration-150",
                    active ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <AuthSlot />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pb-16">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <ul className="grid grid-cols-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.match === "exact"
                ? pathname === item.to
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-accent" : "text-muted",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.7} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
