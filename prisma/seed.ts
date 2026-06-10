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
      name: "Tote",
      slug: "tote",
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

  const sizes = [
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ];

  for (const size of sizes) {
    await prisma.size.upsert({
      where: {
        slug: size.toLowerCase(),
      },
      update: {},
      create: {
        name: size,
        slug: size.toLowerCase(),
      },
    });
  }

  const colors = [
    "Trắng",
    "Đen",
    "Đỏ",
    "Xanh Navy",
  ];

  for (const color of colors) {
    await prisma.color.upsert({
      where: {
        slug: color
          .toLowerCase()
          .replaceAll(" ", "-"),
      },
      update: {},
      create: {
        name: color,
        slug: color
          .toLowerCase()
          .replaceAll(" ", "-"),
      },
    });
  }

  console.log("Seed completed");
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