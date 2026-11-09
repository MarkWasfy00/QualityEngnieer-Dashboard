import { Document, Page, View } from "@react-pdf/renderer";
import type { SalesLine } from "@prisma/client";
import { DEALERSHIP_NAME } from "../../constants";
import { fmtDate, money, int, pct } from "../../format";
import type { getSalesStats, SalesGroup } from "../../sales-journal/stats";
import { s, C, T, Footer, Table, HBarChart, type TCol } from "./shared";

type Stats = Awaited<ReturnType<typeof getSalesStats>>;
const CHART_W = 240;
const GREEN = "#1baf7a";
const millions = (n: number) => `${(n / 1e6).toFixed(1)} م`;

function Box({ title, value, sub, color = C.navy }: { title: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={[s.card, { flex: 1 }]}>
      <T style={{ fontSize: 8, color: C.muted }}>{title}</T>
      <T style={{ fontSize: value.length > 14 ? 11.5 : 14, fontWeight: 700, color, marginTop: 2 }}>{value}</T>
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

const groupCols: TCol<SalesGroup>[] = [
  { label: "الاسم", w: 26, get: (g) => g.name },
  { label: "عربيات", w: 10, get: (g) => int(g.cars), center: true },
  { label: "% من المبيعات", w: 13, get: (g) => pct(g.share), center: true },
  { label: "الإيرادات", w: 20, get: (g) => money(g.revenue) },
  { label: "الربح", w: 18, get: (g) => money(g.profit) },
  { label: "الهامش", w: 13, get: (g) => (g.margin == null ? "—" : pct(g.margin)), center: true },
];
/** Margin bars for groups with enough cars to be meaningful. */
const marginBars = (gs: SalesGroup[], min = 10) =>
  gs.filter((g) => g.cars >= min && g.margin != null && g.name !== "غير محدد")
    .sort((a, b) => b.margin! - a.margin!).map((g) => ({ name: g.name, value: Math.round(g.margin! * 10) / 10 }));

/** Simple sales report from the Odoo journal: summary, 4 numbers, 6 charts, branch/brand tables, losses. */
export default function SalesJournalReport({ d, filters, source }: { d: Stats; filters: string; source?: string }) {
  const x = d.summary;
  const unit = d.periods.unit === "week" ? "أسبوع" : "شهر";
  const top = d.byBrand[0], topB = d.byBranch[0];
  const per = d.periods.rows.slice(-10);
  return (
    <Document title={`تقرير المبيعات — ${filters}`} author={DEALERSHIP_NAME} language="ar-EG">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <T style={s.bandTitle}>تقرير المبيعات</T>
          <T style={s.bandSub}>
            {filters}{d.period.first ? `  ·  من ${fmtDate(d.period.first)} لحد ${fmtDate(d.period.last)}` : ""}  ·  اتطبع يوم {fmtDate(new Date())}{source ? `  ·  من ملف: ${source}` : ""}
          </T>
        </View>

        <View style={[s.card, { backgroundColor: C.light, borderColor: C.light, marginBottom: 10 }]}>
          <T style={{ fontSize: 9.5, lineHeight: 1.7 }}>
            {x.cars
              ? `اتباع ${int(x.cars)} عربية (حوالي ${x.perDay.toFixed(1)} في اليوم) بإيرادات ${money(x.grossRevenue)}. ` +
                (x.margin != null ? `الربح ${money(x.profit)} بهامش ${pct(x.margin)}. ` : "") +
                (x.losses ? `${int(x.losses)} عربية اتباعت بأقل من تكلفتها. ` : "") +
                (top ? `أكتر ماركة ${top.name} (${pct(top.share)})، ` : "") +
                (topB ? `وأكتر فرع ${topB.name} (${pct(topB.share)}). ` : "") +
                (x.returns ? `المرتجعات ${int(x.returns)} (${pct(x.returnRate)}).` : "")
              : "مفيش مبيعات بالفلاتر دي."}
          </T>
        </View>

        <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
          <Box title="العربيات المتباعة" value={int(x.cars)} sub={`${int(x.returns)} مرتجع · الصافي ${int(x.netCars)}`} />
          <Box title="الإيرادات" value={money(x.grossRevenue)} sub={`متوسط العربية ${money(x.avgPrice)}`} />
          <Box title="الربح" value={money(x.profit)} sub={x.margin == null ? "مفيش تكلفة" : `هامش ${pct(x.margin)}`}
            color={x.margin != null && x.margin < 0 ? "#B42318" : "#067647"} />
          <Box title="اتباعت بخسارة" value={int(x.losses)} sub={`فوائد التقسيط ${money(x.interest)}`} color={x.losses ? "#B42318" : "#067647"} />
        </View>

        <T style={s.h2}>الرسومات</T>
        <View style={[s.row, { flexWrap: "wrap", justifyContent: "space-between", marginBottom: 6 }]}>
          <ChartBox title={`العربيات المتباعة كل ${unit}`} sub={d.periods.unit === "week" ? "التاريخ = أول يوم في الأسبوع (السبت)" : "شهر/سنة"}>
            <HBarChart width={CHART_W} max={10} data={per.map((p) => ({ name: p.label, value: p.cars }))} />
          </ChartBox>
          <ChartBox title={`الربح كل ${unit}`} sub="بالمليون جنيه · سعر البيع − تكلفة الشاسيه">
            <HBarChart width={CHART_W} max={10} color={GREEN} fmt={millions} valW={36} data={per.map((p) => ({ name: p.label, value: p.profit }))} />
          </ChartBox>
          <ChartBox title="نسبة العربيات المتباعة لكل ماركة" sub="% من إجمالي العربيات">
            <HBarChart width={CHART_W} max={8} fmt={(n) => pct(n)} valW={30} data={d.byBrand.map((b) => ({ name: b.name, value: b.share }))} />
          </ChartBox>
          <ChartBox title="نسبة العربيات المتباعة لكل فرع" sub="% من إجمالي العربيات">
            <HBarChart width={CHART_W} max={8} fmt={(n) => pct(n)} valW={30} data={d.byBranch.map((b) => ({ name: b.name, value: b.share }))} />
          </ChartBox>
          <ChartBox title="هامش الربح لكل ماركة" sub="ماركات فيها 10 عربيات أو أكتر">
            <HBarChart width={CHART_W} max={8} color={GREEN} fmt={(n) => pct(n)} valW={30} data={marginBars(d.byBrand)} />
          </ChartBox>
          <ChartBox title="هامش الربح لكل فرع" sub="فروع فيها 10 عربيات أو أكتر">
            <HBarChart width={CHART_W} max={8} color={GREEN} fmt={(n) => pct(n)} valW={30} data={marginBars(d.byBranch)} />
          </ChartBox>
        </View>

        <View style={{ marginBottom: 12 }}>
          <T style={s.h2}>حسب الفرع</T>
          <Table rows={d.byBranch} cols={groupCols} />
        </View>
        <View style={{ marginBottom: 12 }}>
          <T style={s.h2}>حسب الماركة</T>
          <Table rows={d.byBrand.slice(0, 15)} cols={groupCols} />
        </View>
        {d.lossRows.length > 0 && (
          <View>
            <T style={s.h2}>أكبر العربيات اللي اتباعت بخسارة — إجمالي {int(d.lossRows.length)} عربية</T>
            <Table rows={d.lossRows.slice(0, 10)} cols={[
              { label: "التاريخ", w: 14, get: (r: SalesLine) => fmtDate(r.date), center: true },
              { label: "العربية", w: 34, get: (r: SalesLine) => r.product },
              { label: "الفرع", w: 14, get: (r: SalesLine) => r.branch },
              { label: "سعر البيع", w: 13, get: (r: SalesLine) => money(r.credit) },
              { label: "الخسارة", w: 13, get: (r: SalesLine) => money(r.credit - (r.chassisCost ?? 0)) },
              { label: "الفاتورة", w: 12, get: (r: SalesLine) => r.invoiceNo, center: true },
            ]} />
          </View>
        )}

        <Footer text="تقرير المبيعات" />
      </Page>
    </Document>
  );
}
