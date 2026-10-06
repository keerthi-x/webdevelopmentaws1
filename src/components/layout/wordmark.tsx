import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function CampusMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-elevated" />
      <path
        d="M8 21V13.5L16 8.5L24 13.5V21"
        className="stroke-accent"
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="18.5" r="3.1" className="stroke-accent" strokeWidth="1.6" fill="none" />
      <path
        d="M16 17.2v2.8"
        className="stroke-accent"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-fg">
      <CampusMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.15rem] tracking-tight">VIT Recover</span>
        {compact ? null : (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Campus lost & found
          </span>
        )}
      </span>
    </Link>
  );
}
