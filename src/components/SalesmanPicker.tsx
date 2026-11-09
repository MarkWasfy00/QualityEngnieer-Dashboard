"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default function SalesmanPicker({ all, selected, max, colors }: { all: string[]; selected: string[]; max: number; colors: string[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const go = (next: string[]) => {
    const q = new URLSearchParams(sp.toString());
    q.set("s", next.join(","));
    router.push(`${path}?${q}`);
  };
  const toggle = (n: string) => {
    if (selected.includes(n)) go(selected.filter((x) => x !== n));
    else if (selected.length < max) go([...selected, n]);
  };
  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-semibold text-foreground">اختار البيّاعين اللي عايز تقارن بينهم (لحد {max})</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {all.map((n) => {
          const i = selected.indexOf(n);
          const on = i >= 0;
          return (
            <Button key={n} variant={on ? "default" : "outline"} aria-pressed={on} className="rounded-full px-4"
              onClick={() => toggle(n)} disabled={!on && selected.length >= max}>
              {on && <span className="size-2.5 rounded-full ring-2 ring-primary-foreground/70" style={{ background: colors[i] }} />}
              {n}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
