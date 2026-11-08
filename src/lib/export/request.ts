import { parseRange } from "../kpis";
import { fmtDate, toInputDate } from "../format";
import { ALL_MODULES, type Module } from "./excel";

export function readExportParams(url: string) {
  const sp = new URL(url).searchParams;
  const range = parseRange({ from: sp.get("from"), to: sp.get("to") });
  const req = sp.get("modules")?.split(",").filter((m): m is Module => (ALL_MODULES as string[]).includes(m));
  const modules = req?.length ? req : ALL_MODULES;
  const period = !range.from && !range.to ? "كل الفترات"
    : `من ${range.from ? fmtDate(range.from) : "البداية"} لحد ${range.to ? fmtDate(range.to) : "النهارده"}`;
  const stamp = toInputDate(new Date());
  return { range, modules, period, stamp };
}

/** Content-Disposition with an Arabic filename (plus ASCII fallback). */
export const attachment = (ascii: string, arabic: string) =>
  `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(arabic)}`;
