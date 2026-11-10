import { Document, Page, View } from "@react-pdf/renderer";
import { DEALERSHIP_NAME } from "../../constants";
import { fmtDate, int, money, pct } from "../../format";
import type { Col, ReportView } from "../../datasets/report";
import type { Rec } from "../../datasets/types";
import { s, C, T, Footer, Table, HBarChart, type TCol } from "./shared";

const CHART_W = 240;
const COLORS = [C.s1, C.s2, "#1baf7a", "#eda100"];
const TONE = { good: "#067647", bad: "#B42318" } as const;
const short = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)} م` : Math.abs(v) >= 1e4 ? `${Math.round(v / 1e3)} ألف` : int(v));

function cell(v: Rec[string], c: Col) {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return c.type === "money" ? money(v) : c.type === "pct" ? pct(v) : int(Math.round(v));
  if (c.type === "date") return fmtDate(v);
  return String(v);
}
/** Column widths (%) from the kind of data — long text gets more room. */
function widths(cols: Col[]) {
  const w = cols.map((c) => (c.type === "text" ? 3 : c.type === "money" ? 2 : c.type === "date" || c.type === "id" ? 1.6 : 1.2));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => (x / sum) * 100);
}
const tcols = (cols: Col[]): TCol<Rec>[] => {
  const w = widths(cols);
  return cols.map((c, i) => ({ label: c.label, w: w[i], get: (r: Rec) => cell(r[c.key], c), center: c.type !== "text" }));
};

function Box({ title, value, sub, color = C.navy }: { title: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={[s.card, { width: "32%", marginBottom: 8 }]} wrap={false}>
      <T style={{ fontSize: 8, color: C.muted }}>{title}</T>
      <T style={{ fontSize: value.length > 16 ? 11 : 13.5, fontWeight: 700, color, marginTop: 2 }}>{value}</T>
      {sub && <T style={{ fontSize: 7.5, color: C.muted, marginTop: 1 }}>{sub}</T>}
    </View>
  );
}
function ChartBox({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={[s.card, { width: "49%", marginBottom: 8 }]} wrap={false}>
      <T style={{ fontSize: 9.5, fontWeight: 700, color: C.navy }}>{title}</T>
      {sub && <T style={{ fontSize: 7, color: C.muted, marginBottom: 4 }}>{sub}</T>}
      <View style={{ marginTop: 4 }}>{children}</View>
    </View>
  );
}

/** One report for any Excel layout: summary, numbers, charts, breakdown tables and the important lists. */
export default function DatasetReport({ title, d, filters, source }: { title: string; d: ReportView; filters: string; source?: string }) {
  const charts = [
    ...d.trends.map((t) => ({ title: t.title, sub: `${t.subtitle}${t.money ? " · بالجنيه" : ""}`, color: COLORS[t.color % 4], data: t.points.slice(-10).map((p) => ({ name: p.label, value: p.value })), money: t.money })),
    ...d.breakdowns.filter((b) => b.chart >= 0).map((b) => ({
      title: b.title, sub: b.columns[b.chart].label, color: COLORS[0], money: b.columns[b.chart].fmt === "money",
      data: b.rows.filter((r) => (r.values[b.chart] ?? 0) > 0).slice(0, 8).map((r) => ({ name: r.name, value: r.values[b.chart] ?? 0 })),
    })),
  ].filter((c) => c.data.length > 0).slice(0, 6);

  return (
    <Document title={`${title} — ${filters}`} author={DEALERSHIP_NAME} language="ar-EG">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <T style={s.bandTitle}>{title}</T>
          <T style={s.bandSub}>
            {filters}{d.period.first ? `  ·  من ${fmtDate(d.period.first)} لحد ${fmtDate(d.period.last)}` : ""}  ·  {int(d.count)} سطر  ·  اتطبع يوم {fmtDate(new Date())}{source ? `  ·  من ملف: ${source}` : ""}
          </T>
        </View>

        {d.summary && (
          <View style={[s.card, { backgroundColor: C.light, borderColor: C.light, marginBottom: 10 }]}>
            <T style={{ fontSize: 9.5, lineHeight: 1.7 }}>{d.summary}</T>
          </View>
        )}

        <View style={[s.row, { flexWrap: "wrap", justifyContent: "space-between", marginBottom: 6 }]}>
          {d.kpis.map((k) => <Box key={k.label} title={k.label} value={k.value} sub={k.hint} color={k.tone ? TONE[k.tone] : C.navy} />)}
        </View>

        {charts.length > 0 && (
          <>
            <T style={s.h2} minPresenceAhead={120}>الرسومات</T>
            <View style={[s.row, { flexWrap: "wrap", justifyContent: "space-between", marginBottom: 6 }]}>
              {charts.map((c) => (
                <ChartBox key={c.title} title={c.title} sub={c.sub}>
                  <HBarChart width={CHART_W} max={10} color={c.color} fmt={c.money ? short : (v) => int(Math.round(v))} valW={c.money ? 38 : 26} data={c.data} />
                </ChartBox>
              ))}
            </View>
          </>
        )}

        {d.breakdowns.map((b) => {
          const w = Math.min(34, 100 - b.columns.length * 11);
          const rest = (100 - w) / b.columns.length;
          return (
            // ≤ 15 short rows always fit on a page: keep the title, header and rows together.
            <View key={b.title} style={{ marginBottom: 12 }} wrap={false}>
              <T style={s.h2} minPresenceAhead={70}>{b.title}{b.more ? ` (أكبر ${int(b.rows.length)} من ${int(b.groups)})` : ""}</T>
              <Table rows={b.rows.slice(0, 15)} cols={[
                { label: "الاسم", w, get: (r) => r.name },
                ...b.columns.map((c, i) => ({ label: c.label, w: rest, get: (r: (typeof b.rows)[number]) => r.display[i], center: true })),
              ]} />
            </View>
          );
        })}

        {d.lists.map((l) => (
          <View key={l.title} style={{ marginBottom: 12 }}>
            <T style={s.h2} minPresenceAhead={70}>{l.title} — {int(l.total)}{l.total > 25 ? " (أول 25)" : ""}</T>
            <Table rows={l.rows.slice(0, 25)} cols={tcols(l.columns)} />
          </View>
        ))}

        <Footer text={title} />
      </Page>
    </Document>
  );
}
