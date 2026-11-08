import { PrismaClient } from "@prisma/client";
import { DEFAULT_CHECKLIST, DEFECT_CATEGORIES, JOB_TYPES, COMPLAINT_CATEGORIES, INSPECTION_TYPES, VISIT_SOURCES } from "../src/lib/constants";
import { scoreInspection } from "../src/lib/validators";

const prisma = new PrismaClient();
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const int = (a: number, b: number) => Math.floor(a + rand() * (b - a + 1));
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);
const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
const vin = () => Array.from({ length: 17 }, () => pick(VIN_CHARS.split(""))).join("");

const MODELS: [string, string][] = [
  ["هيونداي", "إلنترا"], ["هيونداي", "توسان"], ["تويوتا", "كورولا"], ["كيا", "سيراتو"], ["كيا", "سبورتاج"],
  ["نيسان", "صني"], ["شيفروليه", "أوبترا"], ["إم جي", "ZS"], ["شيري", "تيجو 7"], ["رينو", "لوجان"],
  ["بيجو", "301"], ["سكودا", "أوكتافيا"], ["ميتسوبيشي", "لانسر"], ["بي إم دبليو", "320i"],
];
const STORAGES = ["مخزن العبور", "مخزن 6 أكتوبر", "مخزن المعرض الرئيسي"];
const KEEPERS = ["أ. محمد علي", "أ. سامح جمال", "أ. وليد منصور"];
const SALESMEN = ["أ. عمرو سعيد", "أ. مريم عادل", "أ. إسلام حمدي", "أ. رنا فاروق"];
const PRICES: Record<string, [number, number]> = { New: [900, 2400], Used: [350, 1100] }; // thousands EGP
const COLORS = ["أبيض", "أسود", "فضي", "رمادي", "أزرق", "أحمر", "نبيتي"];
const INSPECTORS = ["م. أحمد حسن", "م. محمود سامي", "م. ياسمين فؤاد", "م. كريم عادل"];
const TECHS = ["عم سيد", "محمد عبد الله", "حسام فتحي", "مصطفى رجب", "أحمد شعبان"];
const CUSTOMERS = ["عمر خالد", "منى إبراهيم", "محمد السيد", "هبة مصطفى", "طارق عبد العزيز", "نورهان أشرف", "شريف كمال", "دينا يوسف"];
const DEFECT_TEXT: Record<string, string[]> = {
  "الموتور": ["الموتور بيرعش على البارد", "لمبة الشيك إنجن منورة", "تسريب زيت من وش السلندر"],
  "الفرامل": ["تيل الفرامل الأمامي خلصان", "الفرامل بتصفّر", "الطنابير الخلفية مموجة"],
  "الصاج والدهان": ["خدش في الإكصدام الخلفي", "خبطة في باب السواق", "اختلاف لون في الكبوت"],
  "الكهرباء": ["البطارية ضعيفة", "الفانوس الشمال الخلفي مش شغال", "الشاشة بتعمل ريستارت لوحدها"],
  "الصالون الداخلي": ["بقعة في الكرسي", "كسوة باب مفكوكة", "التكييف مش بيساقع"],
  "الكاوتش والجنوط": ["الكاوتش بياكل من جنب", "خدش في الجنط", "لمبة ضغط الهوا منورة"],
  "الزيوت والتسريب": ["تسريب مية رادياتير", "زيت الموتور ناقص", "تنقيط تحت العربية"],
};
const COMPLAINT_TEXT = ["الصوت رجع تاني بعد الإصلاح", "العربية اتسلمت وفيها خدش", "استنيت كتير على الصيانة", "الفاتورة أعلى من العرض", "لمبة الإنذار لسه منورة"];

async function main() {
  await prisma.$transaction([
    prisma.inspectionItem.deleteMany(), prisma.defect.deleteMany(), prisma.inspection.deleteMany(),
    prisma.serviceJob.deleteMany(), prisma.complaint.deleteMany(), prisma.sale.deleteMany(), prisma.visit.deleteMany(), prisma.salesman.deleteMany(), prisma.vehicle.deleteMany(), prisma.branch.deleteMany(),
  ]);

  const branches = [];
  for (const [name, city, manager] of [["فرع مدينة نصر", "القاهرة", "م. هشام رشدي"], ["فرع الشيخ زايد", "الجيزة", "م. نادين سمير"], ["فرع سموحة", "الإسكندرية", "م. أيمن بدر"]]) {
    branches.push(await prisma.branch.create({ data: { name, city, manager } }));
  }

  const vehicles = [];
  for (let i = 0; i < 30; i++) {
    const [make, model] = pick(MODELS);
    const isNew = rand() < 0.35;
    vehicles.push(await prisma.vehicle.create({
      data: {
        vin: vin(), warehouseName: pick(STORAGES), warehouseKeeper: pick(KEEPERS), branchId: pick(branches).id, make, model,
        year: isNew ? 2026 : int(2014, 2025), mileage: isNew ? int(5, 50) : int(15000, 180000),
        color: pick(COLORS), condition: isNew ? "New" : "Used", createdAt: daysAgo(int(10, 200)),
      },
    }));
  }

  for (const v of vehicles) {
    // Inspection
    const date = daysAgo(int(1, 180));
    const failRate = v.condition === "New" ? 0.01 : 0.035;
    const items = DEFAULT_CHECKLIST.flatMap((c) =>
      c.items.map((item) => ({ category: c.category, item, result: rand() < failRate ? "FAIL" : rand() < 0.04 ? "NA" : "PASS", notes: null })),
    );
    const { score, result } = scoreInspection(items);
    const insp = await prisma.inspection.create({
      data: {
        vehicleId: v.id, date, inspector: pick(INSPECTORS),
        type: v.condition === "New" ? INSPECTION_TYPES[0] : pick(INSPECTION_TYPES.slice(1)),
        score, result, items: { create: items },
      },
    });

    // Defects from failed items
    for (const f of items.filter((i) => i.result === "FAIL")) {
      const cat = (DEFECT_CATEGORIES as readonly string[]).includes(f.category) ? f.category : "أخرى";
      const status = pick(["Open", "In Progress", "Fixed", "Fixed", "Closed"]);
      const reportedAt = new Date(+date + 3600000);
      await prisma.defect.create({
        data: {
          vehicleId: v.id, inspectionId: insp.id, category: cat,
          description: pick(DEFECT_TEXT[cat] ?? [`${f.item} غير مطابق في الفحص`]),
          severity: pick(["Low", "Medium", "Medium", "High", "Critical"]), status,
          technician: pick(TECHS), repairCost: int(4, 120) * 100, reportedAt,
          fixedAt: status === "Fixed" || status === "Closed" ? new Date(+reportedAt + int(1, 6) * 86400000) : null,
        },
      });
    }

    // Service jobs
    for (let j = 0; j < int(0, 3); j++) {
      const openedAt = daysAgo(int(1, 170));
      const done = rand() < 0.8;
      const hours = int(1, 12);
      await prisma.serviceJob.create({
        data: {
          vehicleId: v.id, roNumber: `RO-${int(20000, 29999)}`, jobType: pick(JOB_TYPES),
          technician: pick(TECHS), openedAt, closedAt: done ? new Date(+openedAt + int(2, 72) * 3600000) : null,
          laborHours: hours, laborCost: hours * 350, partsCost: int(0, 150) * 100,
          isComeback: rand() < 0.08, status: done ? "Completed" : pick(["Open", "In Progress"]),
        },
      });
    }
  }

  const salesmanId: Record<string, number> = {};
  for (const sm of SALESMEN) {
    const m = await prisma.salesman.create({
      data: { name: sm, branchId: branches[SALESMEN.indexOf(sm) % branches.length].id, phone: `01${pick(["0", "1", "2", "5"])}${int(10000000, 99999999)}`, hiredAt: daysAgo(int(200, 1500)) },
    });
    salesmanId[sm] = m.id;
  }

  // Sales: ~60% of vehicles sold
  for (const v of vehicles) {
    if (rand() > 0.6) continue;
    const saleDate = daysAgo(int(5, 170));
    const [lo, hi] = PRICES[v.condition];
    const delivered = rand() < 0.85;
    await prisma.sale.create({
      data: {
        vehicleId: v.id, salesmanId: salesmanId[pick(SALESMEN)], customerName: pick(CUSTOMERS),
        customerPhone: `01${pick(["0", "1", "2", "5"])}${int(10000000, 99999999)}`, saleDate,
        price: int(lo, hi) * 1000, paymentType: pick(["Cash", "Cash", "Installments", "Bank"]),
        deliveredAt: delivered ? new Date(+saleDate + int(1, 10) * 86400000) : null,
      },
    });
  }

  // Customer visits: each salesman gets a different number and conversion
  const convRate: Record<string, number> = { [SALESMEN[0]]: 0.35, [SALESMEN[1]]: 0.5, [SALESMEN[2]]: 0.25, [SALESMEN[3]]: 0.4 };
  for (const sm of SALESMEN) {
    for (let k = 0; k < int(6, 14); k++) {
      const r = rand();
      await prisma.visit.create({
        data: {
          salesmanId: salesmanId[sm], customerName: pick(CUSTOMERS), customerPhone: `01${pick(["0", "1", "2", "5"])}${int(10000000, 99999999)}`,
          visitDate: daysAgo(int(1, 170)), source: pick(VISIT_SOURCES), interestedIn: pick(MODELS).join(" "),
          outcome: r < convRate[sm] ? "Won" : r < convRate[sm] + 0.3 ? "FollowUp" : "Lost",
        },
      });
    }
  }

  for (let c = 0; c < 18; c++) {
    const date = daysAgo(int(1, 170));
    const status = pick(["Open", "Investigating", "Resolved", "Resolved", "Closed"]);
    const done = status === "Resolved" || status === "Closed";
    await prisma.complaint.create({
      data: {
        vehicleId: rand() < 0.8 ? pick(vehicles).id : null, customerName: pick(CUSTOMERS),
        contact: `01${pick(["0", "1", "2", "5"])}${int(10000000, 99999999)}`, date, category: pick(COMPLAINT_CATEGORIES),
        description: pick(COMPLAINT_TEXT),
        status, resolvedAt: done ? new Date(+date + int(1, 14) * 86400000) : null,
        satisfaction: done ? int(2, 5) : null,
      },
    });
  }
  console.log(`تم إضافة ${vehicles.length} عربية وبيانات تجريبية`);
}

main().finally(() => prisma.$disconnect());
