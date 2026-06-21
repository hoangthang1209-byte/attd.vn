import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STARTER_MATERIALS = [
  { name: "Nỉ da cá 350gsm", materialType: "MAIN_FABRIC" as const, unit: "kg" },
  { name: "Bo cotton 2x2", materialType: "RIB_FABRIC" as const, unit: "kg" },
  { name: "Nhãn dệt ATTD", materialType: "LABEL" as const, unit: "cái" },
  { name: "Túi PE 35x45", materialType: "PACKAGING" as const, unit: "cái" },
  { name: "Thùng carton 60x40x40", materialType: "CARTON" as const, unit: "cái" },
];

async function main() {
  const existing = await prisma.material.count();
  if (existing > 0) {
    console.log(`Skip seed: ${existing} material(s) already exist.`);
    return;
  }

  for (let i = 0; i < STARTER_MATERIALS.length; i++) {
    const item = STARTER_MATERIALS[i]!;
    const materialCode = `VT-${String(i + 1).padStart(6, "0")}`;
    await prisma.material.create({
      data: {
        materialCode,
        name: item.name,
        materialType: item.materialType,
        unit: item.unit,
        sortOrder: i,
        isActive: true,
      },
    });
    console.log(`Created ${materialCode} · ${item.name}`);
  }

  console.log("Material seed complete (no warehouse balances created).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
