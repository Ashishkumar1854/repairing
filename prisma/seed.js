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

  logger.info(
    {
      businessId: business.id,
      adminId: admin.id,
      customerId: customer.id,
      ticketId: ticket.id,
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
