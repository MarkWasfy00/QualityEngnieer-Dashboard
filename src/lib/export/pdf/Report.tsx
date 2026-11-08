import { Document, Page, View } from "@react-pdf/renderer";
import type { ReportData } from "../../kpis";
import type { Module } from "../excel";
import { DEALERSHIP_NAME, label } from "../../constants";
import { fmtDate, money, pct, num, int, monthLabel } from "../../format";
import { s, C, T, Footer, Table, HBarChart, StackedBars } from "./shared";
import { compareSalesmen, compareBranches } from "../../compare";

const veh = (v: { year: number; make: string; model: string } | null) => (v ? `${v.make} ${v.model} ${v.year}` : "—");

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <View style={{ width: "32%", backgroundColor: C.light, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 9, borderTopWidth: 3, borderTopColor: C.blue }}>
      <T style={{ fontSize: 7.5, color: C.muted, fontWeight: 700 }}>{title}</T>
      <T style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginTop: 1 }}>{value}</T>
      <T style={{ fontSize: 7, color: C.muted }}>{hint}</T>
    </View>
  );
}

export default function Report({ d, modules, period }: { d: ReportData; modules: Module[]; period: string }) {
  const k = d.kpis, b = d.breakdowns;
  const foot = `تقرير الجودة · ${period}`;
  const section = (title: string, count: number, children: React.ReactNode) => (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }]}>
        <T style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{title}</T>
        <T style={{ color: C.muted }}>{int(count)} سجل · {period}</T>
      </View>
      {children}
      <Footer text={foot} />
    </Page>
  );

  return (
    <Document title={`تقرير جودة العربيات — ${period}`} author={DEALERSHIP_NAME} language="ar-EG">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <T style={s.bandTitle}>تقرير جودة العربيات</T>
          <T style={s.bandSub}>{DEALERSHIP_NAME}  ·  الفترة: {period}  ·  اتعمل يوم {fmtDate(new Date())}</T>
        </View>

        <T style={s.h2}>مؤشرات الأداء الرئيسية</T>
        <View style={[s.row, { flexWrap: "wrap", gap: 7, marginBottom: 10 }]}>
          <Kpi title="نسبة النجاح من أول مرة" value={pct(k.firstPassYield)} hint={`من ${int(k.inspections)} فحص`} />
          <Kpi title="متوسط نسبة المطابقة" value={pct(k.avgInspectionScore)} hint="البنود المطابقة من البنود المطبقة" />
          <Kpi title="عيوب مفتوحة" value={int(k.openDefects)} hint={`${int(k.criticalOpen)} حرجة · ${int(k.defects)} متسجلة`} />
          <Kpi title="إجمالي تكلفة الإصلاح" value={money(k.totalRepairCost)} hint={`متوسط ${money(k.avgRepairCost)} للعيب`} />
          <Kpi title="نسبة رجوع العربيات" value={pct(k.comebackRate)} hint={`من ${int(k.serviceJobs)} أمر صيانة`} />
          <Kpi title="متوسط مدة التسليم" value={`${num(k.avgTurnaroundHrs)} ساعة`} hint={`تكلفة الصيانة ${money(k.totalServiceCost)}`} />
          <Kpi title="الشكاوى" value={int(k.complaints)} hint={`${int(k.openComplaints)} لسه مفتوحة`} />
          <Kpi title="متوسط وقت حل الشكوى" value={`${num(k.avgResolutionDays)} يوم`} hint="من الاستلام لحد الحل" />
          <Kpi title="رضا العملاء" value={`${num(k.csat)} من 5`} hint="متوسط التقييم" />
        </View>

        <View style={[s.row, { gap: 10, marginBottom: 10 }]}>
          <View style={[s.card, { flex: 1 }]}>
            <T style={s.h2}>نتايج الفحص كل شهر</T>
            <StackedBars width={240} data={b.inspectionTrend.slice(-8).map((m) => ({ label: monthLabel(m.month, true), a: m.pass, b: m.fail }))} a="مطابق" b="غير مطابق" />
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <T style={s.h2}>العيوب حسب القسم</T>
            <HBarChart data={b.defectsByCategory} width={240} />
          </View>
        </View>
        <View style={[s.row, { gap: 10 }]}>
          <View style={[s.card, { flex: 1 }]}>
            <T style={s.h2}>تكلفة الصيانة حسب نوع الشغلانة</T>
            <HBarChart data={b.costByJobType.map((j) => ({ name: j.name, value: Math.round(j.labor + j.parts) }))} width={240} max={7} />
            <T style={{ fontSize: 7, color: C.muted, marginTop: 3 }}>القيم بالجنيه المصري (مصنعية + قطع غيار)</T>
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <T style={s.h2}>العيوب حسب الخطورة</T>
            <HBarChart data={b.defectsBySeverity} width={240} codes />
            <T style={[s.h2, { marginTop: 6 }]}>الشكاوى حسب الحالة</T>
            <HBarChart data={b.complaintsByStatus} width={240} codes />
          </View>
        </View>
        <Footer text={foot} />
      </Page>

      {modules.includes("inspections") && section("فحوصات العربيات", d.inspections.length,
        <Table rows={d.inspections} cols={[
          { label: "رقم", w: 5, get: (r) => r.id, center: true }, { label: "التاريخ", w: 10, get: (r) => fmtDate(r.date) },
          { label: "العربية", w: 16, get: (r) => veh(r.vehicle) }, { label: "رقم الشاسيه", w: 16, get: (r) => r.vehicle.vin, center: true },
          { label: "نوع الفحص", w: 14, get: (r) => r.type }, { label: "الفاحص", w: 9, get: (r) => r.inspector },
          { label: "البنود غير المطابقة", w: 16, get: (r) => r.items.filter((x) => x.result === "FAIL").map((x) => x.item).join("، ") || "—" },
          { label: "المطابقة", w: 7, get: (r) => pct(r.score), center: true }, { label: "الحكم", w: 7, get: (r) => r.result, chip: true },
        ]} />)}

      {modules.includes("defects") && section("سجل العيوب والمشاكل", d.defects.length,
        <Table rows={d.defects} cols={[
          { label: "التاريخ", w: 9, get: (r) => fmtDate(r.reportedAt) }, { label: "العربية", w: 15, get: (r) => veh(r.vehicle) },
          { label: "القسم", w: 11, get: (r) => r.category }, { label: "وصف العيب", w: 22, get: (r) => r.description },
          { label: "الخطورة", w: 8, get: (r) => r.severity, chip: true }, { label: "الحالة", w: 9, get: (r) => r.status, chip: true },
          { label: "الفني", w: 9, get: (r) => r.technician }, { label: "تاريخ الإصلاح", w: 9, get: (r) => (r.fixedAt ? fmtDate(r.fixedAt) : "—") },
          { label: "التكلفة", w: 8, get: (r) => money(r.repairCost) },
        ]} />)}

      {modules.includes("service") && section("أوامر الصيانة والإصلاح", d.jobs.length,
        <Table rows={d.jobs} cols={[
          { label: "أمر الشغل", w: 8, get: (r) => r.roNumber, center: true }, { label: "تاريخ الفتح", w: 9, get: (r) => fmtDate(r.openedAt) },
          { label: "العربية", w: 15, get: (r) => veh(r.vehicle) }, { label: "نوع الشغلانة", w: 13, get: (r) => r.jobType },
          { label: "الفني", w: 10, get: (r) => r.technician }, { label: "الساعات", w: 6, get: (r) => num(r.laborHours), center: true },
          { label: "المصنعية", w: 8, get: (r) => money(r.laborCost) }, { label: "قطع الغيار", w: 8, get: (r) => money(r.partsCost) },
          { label: "الإجمالي", w: 9, get: (r) => money(r.laborCost + r.partsCost) },
          { label: "رجعت تاني؟", w: 6, get: (r) => (r.isComeback ? "أيوه" : "لأ"), center: true }, { label: "الحالة", w: 8, get: (r) => r.status, chip: true },
        ]} />)}

      {modules.includes("complaints") && section("شكاوى العملاء", d.complaints.length,
        <Table rows={d.complaints} cols={[
          { label: "التاريخ", w: 9, get: (r) => fmtDate(r.date) }, { label: "العميل", w: 12, get: (r) => r.customerName },
          { label: "العربية", w: 15, get: (r) => veh(r.vehicle) }, { label: "نوع الشكوى", w: 13, get: (r) => r.category },
          { label: "التفاصيل", w: 22, get: (r) => r.description }, { label: "الحالة", w: 9, get: (r) => r.status, chip: true },
          { label: "تاريخ الحل", w: 10, get: (r) => (r.resolvedAt ? fmtDate(r.resolvedAt) : "—") },
          { label: "الرضا", w: 7, get: (r) => (r.satisfaction ? `${int(r.satisfaction)} من 5` : "—"), center: true },
        ]} />)}
      {modules.includes("sales") && section("المبيعات", d.sales.length,
        <Table rows={d.sales} cols={[
          { label: "تاريخ البيع", w: 10, get: (r) => fmtDate(r.saleDate) }, { label: "البيّاع", w: 13, get: (r) => r.salesman.name },
          { label: "العربية", w: 17, get: (r) => veh(r.vehicle) }, { label: "رقم الشاسيه", w: 15, get: (r) => r.vehicle.vin, center: true },
          { label: "العميل", w: 13, get: (r) => r.customerName }, { label: "السعر", w: 12, get: (r) => money(r.price) },
          { label: "الدفع", w: 9, get: (r) => label(r.paymentType), center: true },
          { label: "تاريخ التسليم", w: 11, get: (r) => (r.deliveredAt ? fmtDate(r.deliveredAt) : "لسه") },
        ]} />)}

      {modules.includes("branches") && d.branches.length > 0 && (() => {
        const list = d.branches;
        const { rows, wins, leaders } = compareBranches(list);
        const w = 70 / list.length;
        return section("جودة الفروع", list.length,
          <View>
            <Table rows={rows} cols={[
              { label: "المقياس", w: 22, get: (r) => r.label },
              { label: "الأحسن", w: 8, get: (r) => (r.better === "high" ? "الأعلى" : "الأقل"), center: true },
              ...list.map((b, i) => ({ label: b.name, w, center: true, get: (r: (typeof rows)[number]) => r.shown[i], highlight: (r: (typeof rows)[number]) => r.best.includes(i) })),
            ]} />
            <View style={[s.row, { marginTop: 8, backgroundColor: C.light, borderRadius: 4 }]}>
              <T style={[s.cell, { width: "30%", fontWeight: 700, color: C.navy }]}>عدد المقاييس اللي كسبها</T>
              {list.map((b, i) => (
                <T key={b.id} style={[s.cell, { width: `${w}%`, textAlign: "center", fontWeight: 700, color: leaders.includes(i) ? "#93670B" : C.navy }]}>
                  {`${int(wins[i])}${leaders.includes(i) ? " — الأفضل" : ""}`}
                </T>
              ))}
            </View>
            <T style={{ fontSize: 7.5, color: C.muted, marginTop: 6 }}>الخلية الخضرا = الأفضل في المقياس. الفحص والعيوب والصيانة على فرع العربية؛ الشكوى على فرعها أو فرع العربية؛ الزيارات على فرع البيّاع.</T>
          </View>);
      })()}

      {modules.includes("workers") && (() => {
        const list = d.workers.salesmen.filter((x) => x.name !== "غير محدد");
        if (list.length < 2) return null;
        const { rows, wins, leaders } = compareSalesmen(list);
        const w = 70 / list.length;
        return section("مقارنة البيّاعين", list.length,
          <View>
            <Table rows={rows} cols={[
              { label: "المقياس", w: 22, get: (r) => r.label },
              { label: "الأحسن", w: 8, get: (r) => (r.better === "high" ? "الأعلى" : "الأقل"), center: true },
              ...list.map((x, i) => ({ label: x.name, w, center: true, get: (r: (typeof rows)[number]) => r.shown[i], highlight: (r: (typeof rows)[number]) => r.best.includes(i) })),
            ]} />
            <View style={[s.row, { marginTop: 8, backgroundColor: C.light, borderRadius: 4 }]}>
              <T style={[s.cell, { width: "30%", fontWeight: 700, color: C.navy }]}>عدد المقاييس اللي كسبها</T>
              {list.map((x, i) => (
                <T key={x.name} style={[s.cell, { width: `${w}%`, textAlign: "center", fontWeight: 700, color: leaders.includes(i) ? "#93670B" : C.navy }]}>
                  {`${int(wins[i])}${leaders.includes(i) ? " — الأفضل إجمالاً" : ""}`}
                </T>
              ))}
            </View>
            <T style={{ fontSize: 7.5, color: C.muted, marginTop: 6 }}>الخلية الخضرا = الأفضل في المقياس ده. نسبة البيع = الزيارات اللي اشترت ÷ كل الزيارات.</T>
          </View>);
      })()}

      {modules.includes("workers") && section("أداء العمال", d.workers.salesmen.length + d.workers.technicians.length + d.workers.inspectors.length + d.workers.keepers.length,
        <View>
          <T style={s.h2}>البيّاعين</T>
          <Table rows={d.workers.salesmen} cols={[
            { label: "البيّاع", w: 12, get: (r) => r.name },
            { label: "الزيارات", w: 7, get: (r) => int(r.visits), center: true },
            { label: "اشترى", w: 6, get: (r) => int(r.won), center: true },
            { label: "نسبة البيع", w: 8, get: (r) => pct(r.conversionRate), center: true },
            { label: "عربيات اتباعت", w: 7, get: (r) => int(r.carsSold), center: true },
            { label: "إجمالي المبيعات", w: 12, get: (r) => money(r.totalSales) },
            { label: "متوسط السعر", w: 11, get: (r) => money(r.avgPrice) },
            { label: "لسه متسلمتش", w: 7, get: (r) => int(r.pendingDelivery), center: true },
            { label: "أيام التسليم", w: 7, get: (r) => num(r.avgDeliveryDays), center: true },
            { label: "شكاوى", w: 6, get: (r) => int(r.complaints), center: true },
            { label: "نسبة الشكاوى", w: 8, get: (r) => pct(r.complaintRate), center: true },
            { label: "رضا العملاء", w: 9, get: (r) => (r.rated ? `${num(r.csat)} من 5` : "—"), center: true },
          ]} />
          <View style={{ height: 12 }} />
          <T style={s.h2}>الفنيين</T>
          <Table rows={d.workers.technicians} cols={[
            { label: "الفني", w: 14, get: (r) => r.name }, { label: "أوامر الشغل", w: 8, get: (r) => int(r.jobs), center: true },
            { label: "نسبة الإنجاز", w: 9, get: (r) => pct(r.completionRate), center: true },
            { label: "ساعات الشغل", w: 8, get: (r) => num(r.laborHours), center: true },
            { label: "متوسط التسليم بالساعة", w: 10, get: (r) => num(r.avgTurnaroundHrs), center: true },
            { label: "رجعت تاني", w: 7, get: (r) => int(r.comebacks), center: true },
            { label: "نسبة الرجوع", w: 8, get: (r) => pct(r.comebackRate), center: true },
            { label: "عيوب", w: 6, get: (r) => int(r.defects), center: true },
            { label: "نسبة الإصلاح", w: 8, get: (r) => pct(r.fixRate), center: true },
            { label: "أيام الإصلاح", w: 8, get: (r) => num(r.avgFixDays), center: true },
            { label: "قيمة الشغل", w: 14, get: (r) => money(r.revenue) },
          ]} />
          <View style={[s.row, { gap: 12, marginTop: 14 }]} wrap={false}>
            <View style={{ flex: 3 }}>
              <T style={s.h2}>الفاحصين</T>
              <Table rows={d.workers.inspectors} cols={[
                { label: "الفاحص", w: 22, get: (r) => r.name }, { label: "الفحوصات", w: 13, get: (r) => int(r.inspections), center: true },
                { label: "بنود اتفحصت", w: 13, get: (r) => int(r.itemsChecked), center: true },
                { label: "مشاكل اكتشفها", w: 13, get: (r) => int(r.issuesFound), center: true },
                { label: "غير مطابقة", w: 13, get: (r) => int(r.failed), center: true },
                { label: "نسبة الاكتشاف", w: 13, get: (r) => pct(r.detectionRate), center: true },
                { label: "متوسط المطابقة", w: 13, get: (r) => pct(r.avgScore), center: true },
              ]} />
            </View>
            <View style={{ flex: 2 }}>
              <T style={s.h2}>أمناء المخزن</T>
              <Table rows={d.workers.keepers} cols={[
                { label: "أمين المخزن", w: 30, get: (r) => r.name }, { label: "عيوب", w: 14, get: (r) => int(r.defects), center: true },
                { label: "مفتوحة", w: 14, get: (r) => int(r.open), center: true },
                { label: "عالية/حرجة", w: 18, get: (r) => int(r.critical), center: true },
                { label: "التكلفة", w: 24, get: (r) => money(r.cost) },
              ]} />
            </View>
          </View>
        </View>)}
    </Document>
  );
}
