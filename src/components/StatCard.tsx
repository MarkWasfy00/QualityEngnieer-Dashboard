import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE = { good: "text-emerald-700", bad: "text-red-700" } as const;

/** One headline number with a title above and an optional hint below. */
export default function StatCard({ icon: Icon, title, value, hint, tone, valueClassName }: {
  icon?: React.ElementType; title: string; value: React.ReactNode; hint?: React.ReactNode;
  tone?: keyof typeof TONE; valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-primary" />} {title}
        </CardDescription>
        <CardTitle className={cn("text-2xl font-bold", tone && TONE[tone], valueClassName)}>{value}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  );
}
