import type { Field, FieldType, Rec } from "../types";
import { carBrand, knownBrand } from "@/lib/receivables/brands";
import { gkey } from "../cells";
import { n } from "../metrics";

/** Field read from the sheet (aliases = header texts) or, with no aliases, computed in `derive`. */
export const f = (key: string, label: string, type: FieldType = "text", aliases: string[] = [], extra: Partial<Field> = {}): Field =>
  ({ key, label, type, aliases, ...extra });

/** First candidate that names a known brand, else a best guess from the first non-empty one. */
export function brandOf(...cands: unknown[]): string {
  const texts = cands.filter((c): c is string => typeof c === "string" && !!c.trim());
  for (const t of texts) { const b = knownBrand(t); if (b) return b; }
  return texts.length ? carBrand(texts[0]) : "غير محدد";
}

/** Fill a number only when Excel didn't save it (formula without a cached result). */
export function fill(r: Rec, key: string, calc: () => number | null) {
  if (typeof r[key] !== "number") { const v = calc(); if (v != null && isFinite(v)) r[key] = v; }
}
export const num = (v: unknown) => (typeof v === "number" ? v : null);
export const both = (a: unknown, b: unknown) => typeof a === "number" && typeof b === "number";

/** Odoo stock move / transfer type from its reference and locations. */
export function moveType(ref: unknown, from: unknown, to: unknown) {
  const R = String(ref ?? ""), F = String(from ?? ""), T = String(to ?? "");
  if (/تحديث كمية|تحديث الكمية|كمية المنتج/.test(R) || /inventory adjustment/i.test(F + T)) return "تسوية جرد";
  if (/\/IN\//i.test(R) || /partners\/vendors/i.test(F)) return "استلام من مورد";
  if (/\/OUT\//i.test(R) || /partners\/customers/i.test(T)) return "تسليم لعميل";
  if (/\/INT\//i.test(R) || /inter-?compan|transit/i.test(F + T)) return "تحويل داخلي";
  if (/scrap|هالك/i.test(F + T)) return "هالك";
  if (/\/RET|مرتجع|return/i.test(R)) return "مرتجع";
  return "أخرى";
}
export const RECEIPT = "استلام من مورد", DELIVERY = "تسليم لعميل", INTERNAL = "تحويل داخلي", ADJUST = "تسوية جرد";

/** The real warehouse side of a move ("مخزن/زايد"), not the virtual Partners/… location. */
export const warehouseSide = (from: unknown, to: unknown, type: string) => {
  const real = (x: unknown) => typeof x === "string" && !/^(partners|virtual)/i.test(x.trim()) ? x : null;
  return type === RECEIPT ? real(to) ?? real(from) : real(from) ?? real(to);
};

export const AGE_ORDER = ["لحد 30 يوم", "31 – 90 يوم", "91 – 180 يوم", "181 – 365 يوم", "أكتر من سنة", "من غير تاريخ"];
export const ageBucket = (days: number | null) =>
  days == null ? AGE_ORDER[5] : days <= 30 ? AGE_ORDER[0] : days <= 90 ? AGE_ORDER[1] : days <= 180 ? AGE_ORDER[2] : days <= 365 ? AGE_ORDER[3] : AGE_ORDER[4];

export const MONTHS = ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "اغسطس", "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر"];
export const eq = (v: unknown, w: string) => typeof v === "string" && gkey(v) === gkey(w);
export const pos = (key: string) => (r: Rec) => n(r[key]) > 0;
export const neg = (key: string) => (r: Rec) => n(r[key]) < 0;
