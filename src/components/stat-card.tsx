import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "brand" | "success" | "danger";
}) {
  const toneColor = {
    default: "text-foreground",
    brand: "text-brand",
    success: "text-success",
    danger: "text-destructive",
  }[tone];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className={cn("h-5 w-5", toneColor)} />}
      </div>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight", toneColor)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
