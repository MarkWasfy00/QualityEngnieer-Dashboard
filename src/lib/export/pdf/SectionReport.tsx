import { Document, Page, View } from "@react-pdf/renderer";
import { DEALERSHIP_NAME, label } from "../../constants";
import { fmtDate, money, int, num, pct } from "../../format";
import type { Section, SCol } from "../sections";
import { s, C, T, Footer, Table } from "./shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function cellText(c: SCol, r: Row): string {
  const v = c.get(r);
  if (v == null || v === "") return "—";
  switch (c.kind) {
    case "date": return fmtDate(v as Date);
    case "money": return money(Number(v));
    case "int": return int(Number(v));
    case "num": return num(Number(v));
    case "pct": return pct(Number(v));
    case "code": return label(String(v));
    default: return String(v);
  }
}

/** Totals line (count / sum / avg) shown under the table. */
function totals(sec: Section, rows: Row[]) {
  return sec.cols.filter((c) => c.total).map((c) => {
    const vals = rows.map((r) => c.get(r)).filter((v) => v != null && v !== "").map(Number);
    if (c.total === "count") return `عدد السجلات: ${int(rows.length)}`;
    const v = c.total === "sum" ? vals.reduce((a, b) => a + b, 0) : vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const shown = c.kind === "money" ? money(v) : c.kind === "pct" ? pct(v) : c.kind === "int" && c.total === "sum" ? int(v) : num(v);
    return `${c.total === "sum" ? "إجمالي" : "متوسط"} ${c.header}: ${shown}`;
  });
}

export default function SectionReport({ sec, rows, filters }: { sec: Section; rows: Row[]; filters: string }) {
  return (
    <Document title={`${sec.title} — ${filters}`} author={DEALERSHIP_NAME} language="ar-EG">
      <Page size="A4" orientation={sec.landscape ? "landscape" : "portrait"} style={s.page}>
        <View style={s.band}>
          <T style={s.bandTitle}>{sec.title}</T>
          <T style={s.bandSub}>{DEALERSHIP_NAME}  ·  {filters}  ·  اتطبع يوم {fmtDate(new Date())}</T>
        </View>
        <Table rows={rows} cols={sec.cols.map((c) => ({
          label: c.header, w: c.w, chip: c.kind === "badge",
          center: ["int", "num", "pct", "latin", "date"].includes(c.kind ?? ""),
          get: (r: Row) => (c.kind === "badge" ? (c.get(r) as string) : cellText(c, r)),
        }))} />
        {rows.length > 0 && (
          <View style={[s.row, { flexWrap: "wrap", gap: 14, marginTop: 8, padding: 8, backgroundColor: C.light, borderRadius: 4 }]} wrap={false}>
            {totals(sec, rows).map((t) => <T key={t} style={{ fontWeight: 700, color: C.navy, fontSize: 8.5 }}>{t}</T>)}
          </View>
        )}
        <Footer text={`${sec.title} · ${filters}`} />
      </Page>
    </Document>
  );
}
