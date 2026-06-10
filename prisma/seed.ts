import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    {
      name: "Áo thun trơn",
      slug: "ao-thun-tron",
    },
    {
      name: "Áo polo trơn",
      slug: "ao-polo-tron",
    },
    {
      name: "Nón",
      slug: "non",
    },
    {
      name: "Tote Bag",
      slug: "tote",
    },
    {
      name: "Bandana",
      slug: "bandana",
    },
    {
      name: "Bình giữ nhiệt",
      slug: "binh-giu-nhiet",
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: {},
      create: category,
    });
  }

  console.log("Seeded categories");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });