import type ExcelJS from "exceljs";

/** One parsed row. Dates are "yyyy-mm-dd" strings so rows survive JSON as-is. */
export type Rec = Record<string, string | number | null>;

export type FieldType = "text" | "id" | "int" | "number" | "money" | "date" | "pct";
export type Field = {
  key: string;
  label: string;
  type?: FieldType;
  /** Header texts in the sheet that hold this field (compared loosely). Fields without aliases are computed in `derive`. */
  aliases?: string[];
  /** Dates that can't be in the future (sales, receipts): fixes Excel day/month swaps. */
  past?: boolean;
  /** Group spelling/word-order variants of places together ("مخزن اسكندريه" = "مخزن/الإسكندرية"). */
  place?: boolean;
};

export type Fmt = "int" | "money" | "pct" | "days" | "num";
export type Metric = { label: string; fmt: Fmt; calc: (rows: Rec[]) => number | null };
export type Pred = (r: Rec) => boolean;

export type Kpi = {
  metric: Metric;
  hint?: (rows: Rec[]) => string | undefined;
  tone?: (v: number | null, rows: Rec[]) => "good" | "bad" | undefined;
};
export type Breakdown = {
  title: string;
  by: string | ((r: Rec) => string | null);
  metrics: Metric[];
  where?: Pred;
  /** Index of the metric drawn as a bar chart (default 0); -1 = no chart. */
  chart?: number;
  /** Index of the metric used to sort (default = chart metric). */
  sort?: number;
  /** Fixed group order (e.g. age buckets) instead of sorting. */
  order?: string[];
  top?: number;
  subtitle?: string;
};
export type Trend = { title: string; date: string; metric: Metric; where?: Pred; color?: number; subtitle?: string };
export type List = { title: string; where: Pred; sort?: (a: Rec, b: Rec) => number; columns: string[]; limit?: number };

export type ReportSpec = {
  kpis: Kpi[];
  trends?: Trend[];
  breakdowns: Breakdown[];
  lists?: List[];
  /** Columns of the full data table. */
  table: string[];
  /** Fields offered as drop-down filters. */
  filters?: string[];
  /** One short paragraph in plain Egyptian Arabic. */
  summary?: (rows: Rec[]) => string;
};

export type Ctx = { sheet: string; file: string; warnings: string[] };

export type Format = {
  id: string;
  title: string;
  description: string;
  /** Section of the reports index. */
  group: "المخزون" | "المبيعات" | "المديونيات" | "الموردين" | "أخرى";
  fields: Field[];
  /** Field keys whose headers must all be found for the sheet to count as this layout. */
  required?: string[];
  /** Custom reader for layouts that aren't one simple table. Return null when the sheet isn't this layout. */
  parse?: (ws: ExcelJS.Worksheet, ctx: Ctx) => Rec[] | null;
  /** Rows to keep (drops totals, blank template rows…). */
  keep?: (r: Rec) => boolean;
  /** Fills computed fields (formulas Excel didn't save, brand, normalized names…). */
  derive?: (r: Rec, ctx: Ctx) => void;
  /**
   * snapshot: the file is the current state (stock list, debts) — uploading replaces the old data of this layout.
   * append: the file adds/updates records (sales, transfers) — rows are matched by `key`.
   */
  mode: "snapshot" | "append";
  key?: (r: Rec) => string;
  /** The main date, used for the period filter. */
  dateField?: string;
  report: ReportSpec;
};
