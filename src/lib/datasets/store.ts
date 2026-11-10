import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Format, Rec } from "./types";
import { FORMAT_BY_ID, genericFormat } from "./formats";
import type { GenericDef } from "./parse";

type Tx = Prisma.TransactionClient;
const CHUNK = 500;
const chunks = <T,>(xs: T[], n = CHUNK) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export const dsKind = (id: string) => `ds:${id}`;
export const isDsKind = (k: string) => k.startsWith("ds:");
export const reportHref = (id: string) => `/data/${id}`;
export const pdfHref = (id: string) => `/api/export/data/${id}`;

/**
 * Saves the rows of one layout from one upload (all its sheets together).
 * snapshot layouts (or replace = true): the old rows of this layout are removed first.
 * append layouts: rows with the same key are replaced, new ones added.
 */
export async function saveRows(tx: Tx, a: {
  format: Format; generic?: GenericDef | null; sheets: { label: string; rows: Rec[] }[];
  fileName: string; storedPath: string; replace: boolean; warnings: string[];
}) {
  const { format: fmt } = a;
  const wipe = fmt.mode === "snapshot" || a.replace;
  const seen = new Map<string, number>();
  const items = a.sheets.flatMap((s) => s.rows.map((r, i) => {
    let key: string;
    if (fmt.mode === "append" && fmt.key) {
      const base = fmt.key(r);
      const k = (seen.get(base) ?? 0) + 1; // same key twice in one file = two real rows
      seen.set(base, k);
      key = k > 1 ? `${base}#${k}` : base;
    } else key = `${s.label}#${i + 1}`;
    if (key.length > 300) key = createHash("sha1").update(key).digest("hex");
    const d = fmt.dateField ? r[fmt.dateField] : null;
    return { format: fmt.id, key, data: JSON.stringify(r), date: typeof d === "string" ? new Date(d + "T00:00:00Z") : null, sheet: s.label };
  }));

  let updated = 0;
  if (wipe) await tx.dataRow.deleteMany({ where: { format: fmt.id } });
  else {
    for (const part of chunks(items.map((x) => x.key))) {
      updated += (await tx.dataRow.deleteMany({ where: { format: fmt.id, key: { in: part } } })).count;
    }
  }
  const imp = await tx.receivableImport.create({
    data: {
      fileName: a.fileName, storedPath: a.storedPath, kind: dsKind(fmt.id), replaced: wipe, total: items.length,
      sheets: a.sheets.map((s) => s.label).join(" · "), created: items.length - updated, updated,
      warnings: a.warnings.length ? JSON.stringify(a.warnings) : null,
      columns: a.generic ? JSON.stringify(a.generic) : null,
    },
  });
  for (const part of chunks(items, 1000)) await tx.dataRow.createMany({ data: part.map((x) => ({ ...x, importId: imp.id })) });
  return imp;
}

/** Known layout, or an auto-detected table described by its last upload. */
export async function getFormat(id: string): Promise<{ format: Format; generic: GenericDef | null } | null> {
  const known = FORMAT_BY_ID.get(id);
  if (known) return { format: known, generic: null };
  if (!id.startsWith("g-")) return null;
  const imp = await prisma.receivableImport.findFirst({ where: { kind: dsKind(id), columns: { not: null } }, orderBy: { createdAt: "desc" } });
  if (!imp?.columns) return null;
  const generic = JSON.parse(imp.columns) as GenericDef;
  return { format: genericFormat(generic), generic };
}

export async function loadRows(id: string): Promise<Rec[]> {
  const rows = await prisma.dataRow.findMany({ where: { format: id }, select: { data: true }, orderBy: { id: "asc" } });
  return rows.map((r) => JSON.parse(r.data) as Rec);
}

/** Layout + its rows + the report spec (auto-detected tables build theirs from the data). */
export async function loadDataset(id: string) {
  const f = await getFormat(id);
  if (!f) return null;
  const rows = await loadRows(id);
  const format = f.generic ? genericFormat(f.generic, rows) : f.format;
  const last = await prisma.receivableImport.findFirst({ where: { kind: dsKind(id) }, orderBy: { createdAt: "desc" } });
  return { format, rows, last };
}

/** Every layout that has data, with its row count and last upload. */
export async function listDatasets() {
  const [counts, imports] = await Promise.all([
    prisma.dataRow.groupBy({ by: ["format"], _count: { _all: true } }),
    prisma.receivableImport.findMany({ where: { kind: { startsWith: "ds:" } }, orderBy: { createdAt: "desc" } }),
  ]);
  const lastBy = new Map<string, (typeof imports)[number]>();
  for (const i of imports) if (!lastBy.has(i.kind.slice(3))) lastBy.set(i.kind.slice(3), i);
  const out = [];
  for (const c of counts) {
    const last = lastBy.get(c.format);
    const known = FORMAT_BY_ID.get(c.format);
    const generic = !known && last?.columns ? (JSON.parse(last.columns) as GenericDef) : null;
    const format = known ?? (generic ? genericFormat(generic) : null);
    if (format) out.push({ format, count: c._count._all, last });
  }
  return out;
}

/** Label of an import kind for the uploads history. */
export function kindLabel(kind: string, columns?: string | null) {
  if (kind === "journal") return "قيود مبيعات أودو";
  if (kind === "receivables") return "مديونيات";
  const id = kind.replace(/^ds:/, "");
  const known = FORMAT_BY_ID.get(id);
  if (known) return known.title;
  if (columns) { try { return `جدول: ${(JSON.parse(columns) as GenericDef).title}`; } catch { /* ignore */ } }
  return "جدول";
}
