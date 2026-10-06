import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function NativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-md border border-border bg-elevated bg-[length:12px] bg-[right_12px_center] bg-no-repeat px-3 pr-10 text-sm text-fg",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 fill=%22none%22 stroke=%22%239aa396%22 stroke-width=%221.6%22><path d=%22M1 1.5 6 6.5 11 1.5%22/></svg>')]",
        "transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
