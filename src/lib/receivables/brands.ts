import { norm } from "./parse";

/**
 * Car text in the sheet is free-form ("شيرى تيجو 4 برو 2026", "شيري-TIGGO7 PRO MAX", "ام جى").
 * Map it to a brand by keywords. Order matters (e.g. "تيجوان" is VW, not Chery "تيجو"; "CAPTIVA 7 SEAT" is Chevrolet, not SEAT).
 */
const BRANDS: [string, string[]][] = [
  ["فولكس فاجن", ["تايرون", "تاريون", "فولكس", "فولفكس", "فوليكس", "volkswagen", "vw", "تيجوان", "tiguan", "باسات", "passat", "جولف", "golf"]],
  ["إم جي", ["ام جى", "mg", "mg1", "mg5", "mg7", "ام جى وان"]],
  ["شيري", ["شيرى", "chery", "تيجو", "tiggo", "اريزو", "arrizo"]],
  ["شانجان", ["شانجان", "شنجان", "شاناجان", "changan", "ايدو", "eado", "cs35", "cs 35"]],
  ["كيا", ["كيا", "kia", "سبورتاج", "اسبورتاج", "sportage", "سورينتو", "sorento", "سيراتو", "cerato", "بيكانتو", "picanto"]],
  ["هيونداي", ["هيونداى", "hyundai", "النترا", "elantra", "توسان", "tucson", "اكسنت", "accent", "كريتا", "creta"]],
  ["نيسان", ["نيسان", "nissan", "صنى", "sunny", "قشقاى", "كاشقاى", "qashqai", "سنترا", "sentra"]],
  ["شيفروليه", ["شيفروليه", "شيفرولية", "شيفورليه", "شيفرولى", "chevrolet", "che", "اوبترا", "optra", "افيو", "aveo", "كابتفا", "شيفوليه"]],
  ["تويوتا", ["تويوتا", "toyota", "كرولا", "كورولا", "corolla", "فورتشنر", "فورتشينر", "فروشينر", "fortuner", "هاى لوكس", "hilux", "اوربان كروز", "اوريان كروز"]],
  ["بايك", ["بايك", "baic", "u5", "bj"]],
  ["جيتور", ["جيتور", "جى تيور", "جى تور", "jetour", "داشينج", "dashing"]],
  ["هافال", ["هافال", "haval", "جوليان", "jolion", "h6"]],
  ["بروتون", ["بروتون", "proton", "ساجا", "saga"]],
  ["جاك", ["جاك", "jac", "ايزوم"]],
  ["رينو", ["رينو", "renault", "كادجار", "لوجان", "logan", "داستر", "duster", "تالينت", "تاليانت", "كارديان"]],
  ["أوبل", ["اوبل", "opel"]],
  ["ميتسوبيشي", ["ميتسوبيشى", "ميتسوبيى", "متسوبيشى", "ميتشوبيى", "mitsubishi", "mitsubish", "اكسبندر", "xpander", "اكليبس", "اكلبس", "لانسر", "اتروس", "اوتلاتدر", "outlander"]],
  ["ساوايست", ["ساويست", "ساوايست", "سو ايست", "soueast"]],
  ["كايي", ["كاييه", "كايى", "kaiyi"]],
  ["جيلي", ["جيلى", "geely"]],
  ["بيجو", ["بيجو", "peugeot"]],
  ["سكودا", ["سكودا", "skoda"]],
  ["سوزوكي", ["سوزوكى", "سيزوكى", "suzuki", "ديزاير", "سويفت", "swift", "بالينو", "فورنكس"]],
  ["كينج لونج", ["كينج لونج", "king long"]],
  ["فيات", ["فيات", "fiat", "تيبو"]],
  ["جولدن دراجون", ["جولدن دراجون", "golden dragon"]],
  ["مرسيدس", ["مرسيدس", "mercedes"]],
  ["ستروين", ["ستروين", "سيترون", "citroen"]],
  ["إيسوزو", ["ايسوزو", "isuzu", "ديمكس", "ديماكس", "ديميكس"]],
  ["بي واي دي", ["بى واى دى", "byd"]],
  ["DFSK", ["ديفسك", "dfsk", "dfske"]],
  ["KGM", ["kgm"]],
  ["iCAUR", ["icaur", "icaure", "i caure", "i caur", "اى كور"]],
  ["سيات / كوبرا", ["سيات", "سييات", "سايت", "seat", "كوبرا", "cupra", "ابيزا", "ibiza", "ارونا", "leon"]],
].map(([b, ks]) => [b as string, (ks as string[]).map((k) => norm(k).toLowerCase())]);

/** The brand if the text names a known one, otherwise null. */
export function knownBrand(car: string | null | undefined): string | null {
  if (!car) return null;
  const t = ` ${norm(car).toLowerCase().replace(/[-_/|]/g, " ")} `;
  for (const [brand, keys] of BRANDS) {
    // Latin keys must be whole words ("mg" inside another word shouldn't count).
    if (keys.some((k) => (/^[a-z0-9 ]+$/.test(k) ? new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`).test(t) : t.includes(k)))) return brand;
  }
  return null;
}

export function carBrand(car: string | null | undefined): string {
  if (!car) return "غير محدد";
  const known = knownBrand(car);
  if (known) return known;
  // Unknown brand: first word, with common end-letter variants unified (دبابة/دبابه، قصراوى/قصراوي).
  const first = car.replace(/\s+/g, " ").trim().split(/[ -]/)[0].replace(/ة$/, "ه").replace(/ى$/, "ي");
  return first && !/^\d+$/.test(first) ? first : "غير محدد";
}
