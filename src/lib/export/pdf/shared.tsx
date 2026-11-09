import path from "node:path";
import { Font, StyleSheet, Text, View, Svg, Rect, Line, G } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { TextProps } from "@react-pdf/renderer";
import { BRAND, SEVERITY_COLORS, STATUS_COLORS, DEALERSHIP_NAME, label } from "../../constants";
import { int } from "../../format";

// Cairo (Arabic + Latin subsets). Latin is used as fallback for VINs / codes.
const dir = path.join(process.cwd(), "node_modules/@fontsource/cairo/files");
const f = (sub: string, w: number) => path.join(dir, `cairo-${sub}-${w}-normal.woff`);
Font.register({ family: "CairoAr", fonts: [{ src: f("arabic", 400) }, { src: f("arabic", 700), fontWeight: 700 }] });
Font.register({ family: "CairoLa", fonts: [{ src: f("latin", 400) }, { src: f("latin", 700), fontWeight: 700 }] });
Font.registerHyphenationCallback((w) => [w]);
export const FAMILY = ["CairoAr", "CairoLa"];

export const C = {
  navy: `#${BRAND.navy}`, blue: `#${BRAND.blue}`, light: `#${BRAND.light}`, zebra: `#${BRAND.zebra}`,
  border: `#${BRAND.border}`, text: `#${BRAND.text}`, muted: `#${BRAND.muted}`,
  s1: "#2a78d6", s2: "#eb6834",
};
const BOLD = { fontWeight: 700 } as const;

export const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 44, paddingHorizontal: 28, fontFamily: FAMILY as unknown as string, fontSize: 9, color: C.text },
  band: { backgroundColor: C.navy, color: "#fff", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, marginBottom: 12 },
  bandTitle: { fontSize: 18, ...BOLD, color: "#fff" },
  bandSub: { fontSize: 9, color: "#c9d3e6", marginTop: 2 },
  h2: { fontSize: 11.5, ...BOLD, color: C.navy, marginBottom: 6 },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 10, backgroundColor: "#fff" },
  footer: { position: "absolute", bottom: 16, left: 28, right: 28, flexDirection: "row-reverse", justifyContent: "space-between",
    borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 5 },
  th: { flexDirection: "row-reverse", backgroundColor: C.blue, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  tr: { flexDirection: "row-reverse", borderBottomWidth: 0.5, borderBottomColor: C.border },
  cell: { paddingVertical: 4, paddingHorizontal: 5 },
  row: { flexDirection: "row-reverse" },
});

/** RTL-aware text: correct bidi ordering + right alignment. */
type TProps = Omit<TextProps, "style"> & { style?: Style | (Style | undefined)[]; children?: React.ReactNode };
export function T({ style, children, ...rest }: TProps) {
  const base: Style = { direction: "rtl", textAlign: "right" } as Style;
  const extra = Array.isArray(style) ? style.filter(Boolean) as Style[] : style ? [style] : [];
  return <Text {...rest} style={[base, ...extra]}>{children}</Text>;
}

export function Footer({ text }: { text: string }) {
  return (
    <View style={s.footer} fixed>
      <T style={{ fontSize: 7.5, color: C.muted }}>{DEALERSHIP_NAME} · {text}</T>
      <T style={{ fontSize: 7.5, color: C.muted }} render={({ pageNumber, totalPages }) => `صفحة ${int(pageNumber)} من ${int(totalPages)}`} />
    </View>
  );
}

export function Chip({ value }: { value?: string | null }) {
  if (!value) return <T>—</T>;
  const c = SEVERITY_COLORS[value] ?? STATUS_COLORS[value] ?? { bg: BRAND.light, fg: BRAND.navy };
  return (
    <T style={{ backgroundColor: `#${c.bg}`, color: `#${c.fg}`, ...BOLD, fontSize: 7, textAlign: "center",
      paddingVertical: 1, paddingHorizontal: 5, borderRadius: 6, alignSelf: "flex-end" }}>{label(value)}</T>
  );
}

export type TCol<R> = { label: string; w: number; get: (r: R) => string | number | null | undefined; chip?: boolean; center?: boolean; highlight?: (r: R) => boolean };

export function Table<R>({ cols, rows }: { cols: TCol<R>[]; rows: R[] }) {
  return (
    <View>
      <View style={s.th} fixed>
        {cols.map((c) => <T key={c.label} style={[s.cell, { width: `${c.w}%`, color: "#fff", ...BOLD, fontSize: 8, textAlign: c.center ? "center" : "right" }]}>{c.label}</T>)}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
          {cols.map((c) => {
            const hi = c.highlight?.(r);
            return (
              <View key={c.label} style={[s.cell, { width: `${c.w}%` }, hi ? { backgroundColor: "#DCF5E6" } : {}]}>
                {c.chip ? <Chip value={c.get(r) as string} /> :
                  <T style={[{ fontSize: 8, textAlign: c.center ? "center" : "right" }, hi ? { color: "#067647", fontWeight: 700 } : {}]}>{c.get(r) ?? "—"}</T>}
              </View>
            );
          })}
        </View>
      ))}
      {!rows.length && <T style={{ padding: 12, color: C.muted }}>مفيش سجلات في الفترة دي.</T>}
    </View>
  );
}

/** Horizontal bar chart (bars grow right-to-left). */
export function HBarChart({ data, width = 250, color = C.s1, codes = false, max: maxRows = 8, fmt = (n: number) => int(n), valW: valWidth = 22 }: { data: { name: string; value: number }[]; width?: number; color?: string; codes?: boolean; max?: number; fmt?: (n: number) => string; valW?: number }) {
  const rows = data.slice(0, maxRows);
  const max = Math.max(1, ...rows.map((d) => d.value));
  const labelW = 80, valW = valWidth, barW = width - labelW - valW;
  return (
    <View>
      {rows.map((d) => {
        const w = Math.max(2, (d.value / max) * barW);
        return (
          <View key={d.name} style={[s.row, { alignItems: "center", height: 14.5 }]}>
            <T style={{ width: labelW, fontSize: 7.5, lineHeight: 1.3, color: C.muted, paddingLeft: 4 }}>{codes ? label(d.name) : d.name}</T>
            <Svg width={barW} height={10}>
              <Rect x={0} y={0} width={barW} height={10} fill="#f1f4f9" rx={2} />
              <Rect x={barW - w} y={0} width={w} height={10} fill={color} rx={2} />
            </Svg>
            <T style={{ width: valW, fontSize: 7.5, lineHeight: 1.3, textAlign: "left", paddingLeft: 3 }}>{fmt(d.value)}</T>
          </View>
        );
      })}
      {!rows.length && <T style={{ color: C.muted }}>مفيش بيانات</T>}
    </View>
  );
}

/** Stacked vertical bars (two series); first item drawn on the right (RTL). */
export function StackedBars({ data, a, b, width = 250, height = 120, fmt = (n: number) => int(n) }: {
  data: { label: string; a: number; b: number }[]; a: string; b: string; width?: number; height?: number; fmt?: (n: number) => string;
}) {
  const rtlData = [...data].reverse();
  const max = Math.max(1, ...data.map((d) => d.a + d.b));
  const plotH = height - 16;
  const slot = data.length ? width / data.length : width;
  const bw = Math.min(26, slot * 0.6);
  return (
    <View>
      <Svg width={width} height={height}>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <Line key={t} x1={0} x2={width} y1={plotH - t * plotH} y2={plotH - t * plotH} stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="2 2" />
        ))}
        {rtlData.map((d, i) => {
          const x = i * slot + (slot - bw) / 2;
          const ha = (d.a / max) * plotH, hb = (d.b / max) * plotH;
          return (
            <G key={i}>
              <Rect x={x} y={plotH - ha} width={bw} height={ha} fill={C.s1} />
              {hb > 0 && <Rect x={x} y={plotH - ha - hb - 1} width={bw} height={hb} fill={C.s2} />}
            </G>
          );
        })}
        <Line x1={0} x2={width} y1={plotH} y2={plotH} stroke="#94a3b8" strokeWidth={0.75} />
      </Svg>
      <View style={{ flexDirection: "row", marginTop: -14 }}>
        {rtlData.map((d, i) => (
          <T key={i} style={{ width: slot, fontSize: 6.5, color: C.muted, textAlign: "center" }}>{d.label}</T>
        ))}
      </View>
      <View style={[s.row, { gap: 12, marginTop: 6, alignItems: "center" }]}>
        {[[a, C.s1], [b, C.s2]].map(([l, col]) => (
          <View key={l} style={[s.row, { alignItems: "center", gap: 4 }]}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: col }} />
            <T style={{ fontSize: 7.5, color: C.muted }}>{l}</T>
          </View>
        ))}
        <T style={{ fontSize: 7.5, color: C.muted, marginRight: "auto" }}>أعلى قيمة {fmt(max)}</T>
      </View>
    </View>
  );
}
