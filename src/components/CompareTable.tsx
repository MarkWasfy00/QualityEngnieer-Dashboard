import { ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CompareRow } from "@/lib/compare";

/** Metric rows × entity columns; best value per row highlighted green with a mini bar. */
export default function CompareTable({ names, rows, colors, firstHeader = "المقياس" }: {
  names: string[]; rows: CompareRow[]; colors?: string[]; firstHeader?: string;
}) {
  const color = (i: number) => colors?.[i] ?? "var(--chart-1)";
  return (
    <Card className="py-0">
      <Table className="[&_td]:px-4 [&_td]:py-3 [&_th]:px-4">
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground">{firstHeader}</TableHead>
            {names.map((n, i) => (
              <TableHead key={n} className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  {colors && <span className="size-2.5 rounded-full" style={{ background: color(i) }} />}{n}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key} className="hover:bg-transparent">
              <TableCell>
                <div className="font-medium">{r.label}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {r.better === "high" ? <><ArrowUp className="size-3" /> الأعلى أحسن</> : <><ArrowDown className="size-3" /> الأقل أحسن</>}
                </div>
              </TableCell>
              {names.map((n, i) => {
                const v = r.values[i];
                const best = r.best.includes(i);
                const w = v != null && r.max > 0 ? Math.max(3, (v / r.max) * 100) : 0;
                return (
                  <TableCell key={n} className={best ? "bg-green-50" : ""}>
                    <div className="flex items-center gap-2">
                      <span className={best ? "font-bold text-green-800" : ""}>{r.shown[i]}</span>
                      {best && <Badge className="bg-green-100 font-bold text-green-700">الأفضل</Badge>}
                    </div>
                    <div className="mt-1.5 h-1.5 w-full max-w-40 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full" style={{ width: `${w}%`, background: color(i) }} />
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
