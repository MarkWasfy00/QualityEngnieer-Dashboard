import { Document, Page, View, Svg, Path } from "@react-pdf/renderer";
import type { Inspection, InspectionItem, Vehicle, Branch } from "@prisma/client";
import { DEALERSHIP_NAME, label } from "../../constants";
import { fmtDate, int, pct } from "../../format";
import { s, C, T, Footer } from "./shared";

const Mark = ({ r }: { r: string }) => (
  <Svg width={10} height={10} viewBox="0 0 10 10">
    {r === "PASS" ? <Path d="M1.5 5.2 L4 7.7 L8.5 2.5" stroke="#067647" strokeWidth={1.6} fill="none" />
      : r === "FAIL" ? <Path d="M2 2 L8 8 M8 2 L2 8" stroke="#B42318" strokeWidth={1.6} />
      : <Path d="M2 5 L8 5" stroke="#6B7280" strokeWidth={1.4} />}
  </Svg>
);

export default function InspectionCertificate({ i }: { i: Inspection & { vehicle: Vehicle & { branch: Branch | null }; items: InspectionItem[] } }) {
  const v = i.vehicle;
  const pass = i.result === "PASS";
  const groups = [...new Set(i.items.map((x) => x.category))];
  const half = Math.ceil(groups.length / 2);
  const col = (gs: string[]) => (
    <View style={{ flex: 1 }}>
      {gs.map((g) => (
        <View key={g} style={{ marginBottom: 8 }} wrap={false}>
          <T style={{ fontWeight: 700, fontSize: 9, color: C.blue, marginBottom: 2 }}>{g}</T>
          {i.items.filter((x) => x.category === g).map((x) => (
            <View key={x.id} style={[s.row, { alignItems: "center", gap: 6, paddingVertical: 2, paddingHorizontal: 3,
              borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: x.result === "FAIL" ? "#FEF3F2" : undefined }]}>
              <Mark r={x.result} />
              <T style={{ flex: 1 }}>{x.item}{x.notes ? ` — ${x.notes}` : ""}</T>
              <T style={{ fontSize: 7, color: x.result === "FAIL" ? "#B42318" : C.muted }}>{label(x.result)}</T>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
  const info: [string, string][] = [
    ["العربية", `${v.make} ${v.model} ${v.year}`], ["رقم الشاسيه", v.vin], ["المخزن", v.warehouseName ?? "—"],
    ["العداد", `${int(v.mileage)} كم`], ["اللون", v.color ?? "—"], ["الحالة", label(v.condition)],
    ["الفرع", v.branch?.name ?? "—"], ["أمين المخزن", v.warehouseKeeper ?? "—"], ["كود الفحص", `#${i.id}`],
    ["نوع الفحص", i.type], ["تاريخ الفحص", fmtDate(i.date)], ["الفاحص", i.inspector],
  ];
  return (
    <Document title={`تقرير فحص رقم ${i.id} — ${v.vin}`} author={DEALERSHIP_NAME} language="ar-EG">
      <Page size="A4" style={s.page}>
        <View style={[s.band, s.row, { justifyContent: "space-between", alignItems: "center" }]}>
          <View>
            <T style={s.bandTitle}>تقرير فحص عربية</T>
            <T style={s.bandSub}>{DEALERSHIP_NAME}  ·  تقرير رقم {int(i.id)}</T>
          </View>
          <View style={{ alignItems: "center", backgroundColor: pass ? "#DCF5E6" : "#FDE2E1", borderRadius: 6, paddingVertical: 4, paddingHorizontal: 14 }}>
            <T style={{ fontSize: 20, fontWeight: 700, color: pass ? "#067647" : "#B42318", textAlign: "center" }}>{pct(i.score)}</T>
            <T style={{ fontSize: 8, fontWeight: 700, color: pass ? "#067647" : "#B42318", textAlign: "center" }}>{label(i.result)}</T>
          </View>
        </View>
        <View style={[s.row, { flexWrap: "wrap", backgroundColor: C.light, borderRadius: 6, padding: 10, marginBottom: 14 }]}>
          {info.map(([k, val]) => (
            <View key={k} style={{ width: "33.3%", paddingVertical: 3, paddingHorizontal: 4 }}>
              <T style={{ fontSize: 7.5, color: C.muted }}>{k}</T>
              <T style={{ fontWeight: 700 }}>{val}</T>
            </View>
          ))}
        </View>
        <T style={s.h2}>بنود الفحص</T>
        <View style={[s.row, { gap: 16 }]}>{col(groups.slice(0, half))}{col(groups.slice(half))}</View>
        {i.notes && (
          <View style={[s.card, { marginTop: 6 }]}>
            <T style={{ fontWeight: 700, marginBottom: 2 }}>ملاحظات</T><T>{i.notes}</T>
          </View>
        )}
        <View style={[s.row, { gap: 30, marginTop: 30 }]} wrap={false}>
          {["توقيع الفاحص", "مدير الجودة", "التاريخ"].map((l) => (
            <View key={l} style={{ flex: 1, borderTopWidth: 1, borderTopColor: C.text, paddingTop: 3 }}>
              <T style={{ fontSize: 8, color: C.muted }}>{l}</T>
            </View>
          ))}
        </View>
        <Footer text={`تقرير فحص رقم ${int(i.id)} · ${v.vin}`} />
      </Page>
    </Document>
  );
}
