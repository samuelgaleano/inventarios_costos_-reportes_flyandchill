import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-brand/10 text-brand",
  success: "bg-success/10 text-success",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-destructive/10 text-destructive",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
