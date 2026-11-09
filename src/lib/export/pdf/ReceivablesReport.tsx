import { Document, Page, View } from "@react-pdf/renderer";
import { DEALERSHIP_NAME } from "../../constants";
import { fmtDate, money, int, num, pct, monthLabel } from "../../format";
import type { getReceivableStats, Group, Share } from "../../receivables/stats";
import { COLLECT_TARGET_DAYS } from "../../receivables/stats";
import { s, C, T, Footer, Table, HBarChart, StackedBars, type TCol } from "./shared";

type Stats = Awaited<ReturnType<typeof getReceivableStats>>;

function Box({ title, value, sub, color = C.navy }: { title: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={[s.card, { flex: 1 }]}>
      <T style={{ fontSize: 8, color: C.muted }}>{title}</T>
      <T style={{ fontSize: value.length > 14 ? 11.5 : 14, fontWeight: 700, color, marginTop: 2 }}>{value}</T>
      {sub && <T style={{ fontSize: 7.5, color: C.muted, marginTop: 1 }}>{sub}</T>}
    </View>
  );
}

const CHART_W = 240;
/** One chart in the 2-column grid. */
function ChartBox({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={[s.card, { width: "49%", marginBottom: 8 }]} wrap={false}>
      <T style={{ fontSize: 9.5, fontWeight: 700, color: C.navy }}>{title}</T>
      {sub && <T style={{ fontSize: 7, color: C.muted, marginBottom: 4 }}>{sub}</T>}
      <View style={{ marginTop: 4 }}>{children}</View>
    </View>
  );
}
const pctFmt = (n: number) => `${n}%`;
/** Rounded collection-rate bars for groups with enough deals to be meaningful. */
const rateBars = (gs: Group[], min = 10) =>
  gs.filter((g) => g.deals >= min && g.name !== "غير محدد").sort((a, b) => b.rate - a.rate)
    .map((g) => ({ name: g.name, value: Math.round(g.rate) }));

const groupCols = (sold: number): TCol<Group>[] => [
  { label: "الاسم", w: 24, get: (g) => g.name },
  { label: "صفقات", w: 10, get: (g) => int(g.deals), center: true },
  { label: "% من المبيعات", w: 12, get: (g) => pct(sold ? (g.deals / sold) * 100 : 0), center: true },
  { label: "اتحصّل", w: 12, get: (g) => pct(g.rate), center: true },
  { label: "المتبقي", w: 24, get: (g) => money(g.openValue) },
  { label: `متأخر +${COLLECT_TARGET_DAYS}`, w: 18, get: (g) => int(g.overdue), center: true },
];

/** Top N brands + the rest merged into one row. */
function topShares(xs: Share[], n = 12): Share[] {
  if (xs.length <= n + 1) return xs;
  const rest = xs.slice(n);
  return [...xs.slice(0, n), { name: "ماركات تانية", count: rest.reduce((a, x) => a + x.count, 0),
    pct: rest.reduce((a, x) => a + x.pct, 0), value: rest.reduce((a, x) => a + x.value, 0) }];
}

/** Simple receivables report: summary, 4 numbers, charts, cars sold %, debt age, by bank, by branch. */
export default function ReceivablesReport({ d, filters, source }: { d: Stats; filters: string; source?: string }) {
  const x = d.summary;
  return (
    <Document title={`تقرير التحصيل — ${filters}`} author={DEALERSHIP_NAME} language="ar-EG">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <T style={s.bandTitle}>تقرير التحصيل والمديونيات</T>
          <T style={s.bandSub}>{filters}  ·  اتطبع يوم {fmtDate(new Date())}{source ? `  ·  من ملف: ${source}` : ""}</T>
        </View>

        <View style={[s.card, { backgroundColor: C.light, borderColor: C.light, marginBottom: 10 }]}>
          <T style={{ fontSize: 9.5, lineHeight: 1.7 }}>
            {x.deals
              ? `اتحصّل ${pct(x.rate)} من الصفقات (${int(x.collected)} من ${int(x.deals)}) بقيمة ${money(x.collectedValue)}. ` +
                (x.avgDays != null ? `التحصيل بياخد في المتوسط ${num(x.avgDays, 0)} يوم من البيع. ` : "") +
                `فاضل ${int(x.open)} صفقة بـ ${money(x.openValue)}` +
                (x.overdue ? `، منهم ${int(x.overdue)} متأخرين أكتر من ${COLLECT_TARGET_DAYS} يوم بـ ${money(x.overdueValue)}.` : ".")
              : "مفيش صفقات بالفلاتر دي."}
          </T>
        </View>

        <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
          <Box title="نسبة التحصيل" value={pct(x.rate)} sub={`بالقيمة ${pct(x.valueRate)}`} color={x.rate >= 80 ? "#067647" : x.rate < 60 ? "#B42318" : C.navy} />
          <Box title="اتحصّل" value={money(x.collectedValue)} sub={`${int(x.collected)} صفقة`} />
          <Box title="المتبقي" value={money(x.openValue)} sub={`${int(x.open)} صفقة`} />
          <Box title={`متأخر +${COLLECT_TARGET_DAYS} يوم`} value={int(x.overdue)} sub={money(x.overdueValue)} color={x.overdue ? "#B42318" : "#067647"} />
        </View>

        <T style={s.h2}>الرسومات</T>
        <View style={[s.row, { flexWrap: "wrap", justifyContent: "space-between", marginBottom: 6 }]}>
          <ChartBox title="الصفقات كل شهر" sub="حسب شهر البيع (شهر/سنة) · أزرق = اتحصّلت، برتقالي = لسه">
            <StackedBars width={CHART_W} height={120} a="اتحصّلت" b="لسه"
              data={d.monthly.slice(-12).map((m) => ({ label: `${Number(m.month.slice(5))}/${m.month.slice(2, 4)}`, a: m.collected, b: m.open }))} />
          </ChartBox>
          <ChartBox title="نسبة العربيات المتباعة لكل ماركة" sub="% من إجمالي العربيات المتباعة">
            <HBarChart width={CHART_W} max={8} fmt={(n) => pct(n)} valW={30}
              data={d.sales.brands.map((b) => ({ name: b.name, value: b.pct }))} />
          </ChartBox>
          <ChartBox title="نسبة التحصيل لكل فرع" sub="% من صفقات الفرع اللي اتحصّلت (فروع فيها 10 صفقات أو أكتر)">
            <HBarChart width={CHART_W} max={8} fmt={pctFmt} valW={30} color="#1baf7a" data={rateBars(d.byBranch)} />
          </ChartBox>
          <ChartBox title="نسبة التحصيل لكل بنك / طريقة دفع" sub="% من الصفقات اللي اتحصّلت (10 صفقات أو أكتر)">
            <HBarChart width={CHART_W} max={8} fmt={pctFmt} valW={30} color="#1baf7a" data={rateBars(d.byBank)} />
          </ChartBox>
          <ChartBox title="عمر المديونية المفتوحة" sub="عدد الصفقات اللي لسه متحصّلتش حسب عدد الأيام من البيع">
            <HBarChart width={CHART_W} max={5} color={C.s2} data={d.aging.map((a) => ({ name: a.name, value: a.count }))} />
          </ChartBox>
          <ChartBox title="متوسط أيام التحصيل كل شهر" sub={`حسب شهر التحصيل · المستهدف ${COLLECT_TARGET_DAYS} يوم`}>
            <HBarChart width={CHART_W} max={8} fmt={(n) => `${int(n)} يوم`} valW={38}
              color={C.s1} data={d.collectDays.slice(-8).map((m) => ({ name: monthLabel(m.month), value: m.avg }))} />
          </ChartBox>
        </View>

        <View wrap={false} style={{ marginBottom: 12 }}>
          <T style={s.h2}>العربيات المتباعة: {int(d.sales.total)} عربية</T>
          <T style={{ fontSize: 8.5, color: C.muted, marginBottom: 5 }}>
            {d.sales.payments.map((p) => `${p.name} ${pct(p.pct)}`).join("  ·  ")}
          </T>
          <Table rows={topShares(d.sales.brands)} cols={[
            { label: "الماركة", w: 40, get: (b: Share) => b.name },
            { label: "عدد العربيات", w: 25, get: (b: Share) => int(b.count), center: true },
            { label: "النسبة من المبيعات", w: 35, get: (b: Share) => pct(b.pct), center: true },
          ]} />
        </View>

        <View wrap={false} style={{ marginBottom: 12 }}>
          <T style={s.h2}>عمر المديونية المفتوحة</T>
          <Table rows={d.aging} cols={[
            { label: "من يوم البيع", w: 40, get: (a) => a.name },
            { label: "صفقات", w: 20, get: (a) => int(a.count), center: true },
            { label: "المبلغ", w: 40, get: (a) => money(a.value) },
          ]} />
        </View>

        <View style={{ marginBottom: 12 }}>
          <T style={s.h2}>حسب البنك / طريقة الدفع</T>
          <Table rows={d.byBank.slice(0, 12)} cols={groupCols(d.sales.total)} />
        </View>

        <View>
          <T style={s.h2}>حسب الفرع</T>
          <Table rows={d.byBranch} cols={groupCols(d.sales.total)} />
        </View>

        <Footer text="تقرير التحصيل والمديونيات" />
      </Page>
    </Document>
  );
}
