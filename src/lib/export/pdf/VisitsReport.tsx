import { Document, Page, View } from "@react-pdf/renderer";
import { DEALERSHIP_NAME } from "../../constants";
import { fmtDate, pct, int } from "../../format";
import { s, C, T, Footer, Table, HBarChart } from "./shared";

export type VisitRow = {
  id: number; visitDate: Date; count: number; customerName: string | null; customerPhone: string | null; source: string;
  interestedIn: string | null; outcome: string; notes: string | null; salesman: { name: string };
};

const rate = (a: number, b: number) => (b ? (a / b) * 100 : 0);

function Stat({ title, value, hint, color = C.navy }: { title: string; value: string; hint?: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.light, borderRadius: 6, padding: 9, borderTopWidth: 3, borderTopColor: color }}>
      <T style={{ fontSize: 7.5, color: C.muted, fontWeight: 700 }}>{title}</T>
      <T style={{ fontSize: 17, fontWeight: 700, color: C.navy }}>{value}</T>
      {hint ? <T style={{ fontSize: 7, color: C.muted }}>{hint}</T> : null}
    </View>
  );
}

export default function VisitsReport({ visits, filters }: { visits: VisitRow[]; filters: string }) {
  const sum = (xs: VisitRow[]) => xs.reduce((a, v) => a + v.count, 0); // bulk rows carry a count
  const total = sum(visits);
  const won = sum(visits.filter((v) => v.outcome === "Won"));
  const follow = sum(visits.filter((v) => v.outcome === "FollowUp"));
  const lost = sum(visits.filter((v) => v.outcome === "Lost"));

  const bySalesman = [...new Set(visits.map((v) => v.salesman.name))].map((name) => {
    const vs = visits.filter((v) => v.salesman.name === name);
    const w = sum(vs.filter((v) => v.outcome === "Won"));
    return {
      name, visits: sum(vs), won: w,
      follow: sum(vs.filter((v) => v.outcome === "FollowUp")),
      lost: sum(vs.filter((v) => v.outcome === "Lost")),
      conv: rate(w, sum(vs)),
    };
  }).sort((a, b) => b.conv - a.conv || b.visits - a.visits);

  const bySource = [...new Set(visits.map((v) => v.source))]
    .map((src) => ({ name: src, value: sum(visits.filter((v) => v.source === src)) }))
    .sort((a, b) => b.value - a.value);

  return (
    <Document title={`تقرير زيارات العملاء — ${filters}`} author={DEALERSHIP_NAME} language="ar-EG">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.band}>
          <T style={s.bandTitle}>تقرير زيارات العملاء</T>
          <T style={s.bandSub}>{DEALERSHIP_NAME}  ·  {filters}  ·  اتطبع يوم {fmtDate(new Date())}</T>
        </View>

        <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
          <Stat title="إجمالي الزيارات" value={int(total)} />
          <Stat title="اشترى" value={int(won)} color="#067647" />
          <Stat title="لسه بيفكر (متابعة)" value={int(follow)} color="#B54708" />
          <Stat title="مشتراش" value={int(lost)} color="#B42318" />
          <Stat title="نسبة البيع من الزيارات" value={pct(rate(won, total))} hint="اشترى ÷ كل الزيارات" color={C.blue} />
        </View>

        <View style={[s.row, { gap: 10, marginBottom: 12 }]} wrap={false}>
          <View style={{ flex: 2 }}>
            <T style={s.h2}>حسب البيّاع</T>
            <Table rows={bySalesman} cols={[
              { label: "البيّاع", w: 30, get: (r) => r.name },
              { label: "الزيارات", w: 14, get: (r) => int(r.visits), center: true },
              { label: "اشترى", w: 14, get: (r) => int(r.won), center: true },
              { label: "لسه بيفكر", w: 14, get: (r) => int(r.follow), center: true },
              { label: "مشتراش", w: 14, get: (r) => int(r.lost), center: true },
              { label: "نسبة البيع", w: 14, get: (r) => pct(r.conv), center: true },
            ]} />
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <T style={s.h2}>العملاء جم منين؟</T>
            <HBarChart data={bySource} width={210} />
          </View>
        </View>

        <T style={s.h2}>تفاصيل الزيارات</T>
        <Table rows={visits} cols={[
          { label: "التاريخ", w: 9, get: (r) => fmtDate(r.visitDate) },
          { label: "البيّاع", w: 12, get: (r) => r.salesman.name },
          { label: "العدد", w: 5, get: (r) => int(r.count), center: true },
          { label: "العميل", w: 12, get: (r) => r.customerName ?? (r.count > 1 ? "زيارات مجمّعة" : "—") },
          { label: "الموبايل", w: 11, get: (r) => r.customerPhone ?? "—", center: true },
          { label: "جه منين", w: 11, get: (r) => r.source },
          { label: "مهتم بـ", w: 14, get: (r) => r.interestedIn ?? "—" },
          { label: "النتيجة", w: 9, get: (r) => r.outcome, chip: true },
          { label: "ملاحظات", w: 17, get: (r) => r.notes ?? "" },
        ]} />
        <Footer text={`زيارات العملاء · ${filters}`} />
      </Page>
    </Document>
  );
}
