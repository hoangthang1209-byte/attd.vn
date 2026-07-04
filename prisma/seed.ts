import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const manufacturingCategories = [
  { name: "Warehouse", slug: "warehouse" },
  { name: "Production", slug: "production" },
  { name: "Cutting", slug: "cutting" },
  { name: "Sewing", slug: "sewing" },
  { name: "Printing", slug: "printing" },
  { name: "Embroidery", slug: "embroidery" },
  { name: "QC", slug: "qc" },
  { name: "Packing", slug: "packing" },
  { name: "Delivery", slug: "delivery" },
  { name: "Material Samples", slug: "material-samples" },
  { name: "Real Orders", slug: "real-orders" },
  { name: "Case Studies", slug: "case-studies" },
  { name: "Machines", slug: "machines" },
  { name: "Certificates", slug: "certificates" },
  { name: "Team", slug: "team" },
  { name: "Videos", slug: "videos" },
] as const;

const manufacturingDisplayLocations = [
  { key: "homepage", name: "Homepage" },
  { key: "product-detail", name: "Product Detail" },
  { key: "dealer-landing", name: "Dealer Landing" },
  { key: "contact", name: "Contact" },
  { key: "blog", name: "Blog" },
  { key: "rfq", name: "RFQ" },
  { key: "quote-pdf", name: "Quote PDF" },
  { key: "dealer-portal", name: "Dealer Portal" },
  { key: "customer-portal", name: "Customer Portal" },
] as const;

const manufacturingWorkflows = [
  {
    name: "Cotton T-Shirt Workflow",
    slug: "cotton-t-shirt-workflow",
    steps: [
      "Artwork",
      "Material Preparation",
      "Cutting",
      "Sewing",
      "Printing or Embroidery",
      "QC",
      "Packing",
      "Delivery",
    ],
  },
  {
    name: "Silkscreen Printing Workflow",
    slug: "silkscreen-printing-workflow",
    steps: [
      "Artwork Check",
      "Film / Screen Preparation",
      "Ink Mixing",
      "Sample Print",
      "Bulk Printing",
      "Curing",
      "QC",
      "Packing",
    ],
  },
  {
    name: "Embroidery Workflow",
    slug: "embroidery-workflow",
    steps: [
      "Artwork Check",
      "Digitizing",
      "Thread Color Matching",
      "Sample Embroidery",
      "Bulk Embroidery",
      "Trimming",
      "QC",
      "Packing",
    ],
  },
  {
    name: "Sublimation Workflow",
    slug: "sublimation-workflow",
    steps: [
      "Artwork Check",
      "Color Proof",
      "Transfer Printing",
      "Heat Press",
      "Cooling",
      "QC",
      "Packing",
    ],
  },
  {
    name: "Packing & Delivery Workflow",
    slug: "packing-delivery-workflow",
    steps: [
      "Final QC",
      "Folding",
      "Polybag / Packaging",
      "Carton Packing",
      "Labeling",
      "Handover",
      "Delivery",
    ],
  },
] as const;

function stepKeyFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seedManufacturingLibrary() {
  for (const [index, category] of manufacturingCategories.entries()) {
    await prisma.manufacturingCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        sortOrder: (index + 1) * 10,
        active: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: (index + 1) * 10,
        active: true,
      },
    });
  }

  for (const [index, location] of manufacturingDisplayLocations.entries()) {
    await prisma.manufacturingDisplayLocation.upsert({
      where: { key: location.key },
      update: {
        name: location.name,
        sortOrder: (index + 1) * 10,
        active: true,
      },
      create: {
        key: location.key,
        name: location.name,
        sortOrder: (index + 1) * 10,
        active: true,
      },
    });
  }

  for (const [workflowIndex, workflowSeed] of manufacturingWorkflows.entries()) {
    const workflow = await prisma.manufacturingWorkflowTemplate.upsert({
      where: { slug: workflowSeed.slug },
      update: {
        name: workflowSeed.name,
        sortOrder: (workflowIndex + 1) * 10,
        active: true,
      },
      create: {
        name: workflowSeed.name,
        slug: workflowSeed.slug,
        sortOrder: (workflowIndex + 1) * 10,
        active: true,
      },
    });

    for (const [stepIndex, title] of workflowSeed.steps.entries()) {
      const stepKey = stepKeyFromTitle(title);
      const existing = await prisma.manufacturingWorkflowStep.findFirst({
        where: {
          workflowId: workflow.id,
          stepKey,
        },
      });

      const data = {
        title,
        stepKey,
        sortOrder: (stepIndex + 1) * 10,
      };

      if (existing) {
        await prisma.manufacturingWorkflowStep.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.manufacturingWorkflowStep.create({
          data: {
            workflowId: workflow.id,
            ...data,
          },
        });
      }
    }
  }
}

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

  await seedManufacturingLibrary();

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
