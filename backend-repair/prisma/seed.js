const bcrypt = require("bcrypt");

const env = require("../src/core/config/env");
const prisma = require("../src/core/database/prisma");
const logger = require("../src/core/logger/logger");

const seed = async () => {
  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);

  const business = await prisma.business.upsert({
    where: { slug: "demo-repair" },
    update: {},
    create: {
      name: "Demo Repair",
      slug: "demo-repair",
      type: "REPAIR_SHOP",
      email: "owner@demo-repair.local",
      phone: "+10000000000",
      address: "Demo Service Center",
    },
  });

  const admin = await prisma.staffMember.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: "admin@demo-repair.local",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      fullName: "Demo Admin",
      email: "admin@demo-repair.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  const technician = await prisma.staffMember.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: "tech@demo-repair.local",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      fullName: "Demo Technician",
      email: "tech@demo-repair.local",
      passwordHash,
      role: "TECHNICIAN",
    },
  });

  const technician2 = await prisma.staffMember.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: "tech2@demo-repair.local",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      fullName: "Demo Technician Two",
      email: "tech2@demo-repair.local",
      passwordHash,
      role: "TECHNICIAN",
    },
  });

  const customer = await prisma.customer.upsert({
    where: {
      businessId_phone: {
        businessId: business.id,
        phone: "+19999999999",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      fullName: "Sample Customer",
      phone: "+19999999999",
      email: "customer@example.local",
      address: "Sample Customer Address",
    },
  });

  const ticket = await prisma.repairTicket.upsert({
    where: {
      businessId_ticketNumber: {
        businessId: business.id,
        ticketNumber: "REP-000001",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      customerId: customer.id,
      ticketNumber: "REP-000001",
      title: "Sample intake ticket",
      description: "Seed ticket for infrastructure validation.",
      status: "RECEIVED",
      priority: "NORMAL",
      items: {
        create: {
          businessId: business.id,
          itemType: "mobile_phone",
          brand: "Demo Brand",
          model: "Demo Model",
          condition: "Received for initial inspection",
        },
      },
    },
  });

  await prisma.repairStatusLog.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      businessId: business.id,
      repairTicketId: ticket.id,
      actorStaffId: admin.id,
      fromStatus: null,
      toStatus: "RECEIVED",
      reason: "Initial seed status",
    },
  });

  const inventoryItem = await prisma.inventoryItem.upsert({
    where: {
      businessId_sku: {
        businessId: business.id,
        sku: "IPH13-DISP-OLED",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      sku: "IPH13-DISP-OLED",
      partName: "iPhone 13 OLED display assembly",
      category: "Display",
      stockQuantity: "10.00",
      unitCost: "42.50",
      sellingPrice: "120.00",
      reorderLevel: "2.00",
      barcode: "IPH13DISP001",
    },
  });

  await prisma.inventoryStockMovement.upsert({
    where: { id: "00000000-0000-0000-0000-000000000006" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000006",
      businessId: business.id,
      inventoryItemId: inventoryItem.id,
      actorStaffId: admin.id,
      type: "STOCK_IN",
      quantityBefore: "0.00",
      quantityChanged: "10.00",
      quantityAfter: "10.00",
      unitCost: "42.50",
      notes: "Initial seed stock",
      metadata: {
        source: "seed",
      },
    },
  });

  logger.info(
    {
      businessId: business.id,
      adminId: admin.id,
      technicianId: technician.id,
      technician2Id: technician2.id,
      customerId: customer.id,
      ticketId: ticket.id,
      inventoryItemId: inventoryItem.id,
    },
    "Database seed completed"
  );
};

seed()
  .catch((error) => {
    logger.error({ err: error }, "Database seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
