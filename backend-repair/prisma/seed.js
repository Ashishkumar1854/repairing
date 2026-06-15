const bcrypt = require("bcrypt");

const env = require("../src/core/config/env");
const prisma = require("../src/core/database/prisma");
const logger = require("../src/core/logger/logger");

const seed = async () => {
  const ownerEmail = env.OWNER_EMAIL.toLowerCase();
  const ownerPasswordHash = await bcrypt.hash(env.OWNER_PASSWORD, 12);
  const seedAdminEmail = env.SEED_ADMIN_EMAIL?.toLowerCase();
  const seedAdminPasswordHash = env.SEED_ADMIN_PASSWORD
    ? await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12)
    : ownerPasswordHash;
  const technicianPasswordHash = seedAdminPasswordHash;
  const superAdminPasswordHash = await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12);

  const business = await prisma.business.upsert({
    where: { slug: "demo-repair" },
    update: {
      name: "Demo Repair",
      status: "ACTIVE",
      description: "Demo repair shop tenant for local ERP and SaaS validation.",
      email: ownerEmail,
      phone: "+10000000000",
      website: "https://demo-repair.local",
      country: "India",
      state: "Chhattisgarh",
      city: "Bhilai",
      address: "Demo Service Center",
      gstNumber: "22AAAAA0000A1Z5",
    },
    create: {
      name: "Demo Repair",
      slug: "demo-repair",
      type: "REPAIR_SHOP",
      status: "ACTIVE",
      description: "Demo repair shop tenant for local ERP and SaaS validation.",
      email: ownerEmail,
      phone: "+10000000000",
      website: "https://demo-repair.local",
      country: "India",
      state: "Chhattisgarh",
      city: "Bhilai",
      address: "Demo Service Center",
      gstNumber: "22AAAAA0000A1Z5",
    },
  });

  await prisma.subscription.upsert({
    where: { businessId: business.id },
    update: {
      plan: "GROWTH",
      status: "ACTIVE",
      expiresAt: new Date("2027-06-09T00:00:00.000Z"),
    },
    create: {
      businessId: business.id,
      plan: "GROWTH",
      status: "ACTIVE",
      startsAt: new Date("2026-06-09T00:00:00.000Z"),
      expiresAt: new Date("2027-06-09T00:00:00.000Z"),
    },
  });

  const mainBranch = await prisma.branch.upsert({
    where: {
      businessId_code: {
        businessId: business.id,
        code: "MAIN",
      },
    },
    update: {
      name: "Main Branch",
      status: "ACTIVE",
      isMainBranch: true,
      phone: "+10000000000",
      email: ownerEmail,
      address: "Demo Service Center",
    },
    create: {
      businessId: business.id,
      name: "Main Branch",
      code: "MAIN",
      status: "ACTIVE",
      isMainBranch: true,
      phone: "+10000000000",
      email: ownerEmail,
      address: "Demo Service Center",
    },
  });

  const owner = await prisma.staffMember.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: ownerEmail,
      },
    },
    update: {
      fullName: "Demo Owner",
      role: "OWNER",
      isActive: true,
      passwordHash: ownerPasswordHash,
      branchId: null,
      deletedAt: null,
    },
    create: {
      businessId: business.id,
      branchId: null,
      fullName: "Demo Owner",
      email: ownerEmail,
      passwordHash: ownerPasswordHash,
      role: "OWNER",
    },
  });

  const admin = seedAdminEmail
    ? await prisma.staffMember.upsert({
        where: {
          businessId_email: {
            businessId: business.id,
            email: seedAdminEmail,
          },
        },
        update: {
          fullName: "Demo Admin",
          role: "ADMIN",
          isActive: true,
          passwordHash: seedAdminPasswordHash,
          branchId: mainBranch.id,
          deletedAt: null,
        },
        create: {
          businessId: business.id,
          branchId: mainBranch.id,
          fullName: "Demo Admin",
          email: seedAdminEmail,
          passwordHash: seedAdminPasswordHash,
          role: "ADMIN",
        },
      })
    : owner;

  const technician = await prisma.staffMember.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: "tech@demo-repair.local",
      },
    },
    update: {
      fullName: "Demo Technician",
      role: "TECHNICIAN",
      isActive: true,
      passwordHash: technicianPasswordHash,
      branchId: mainBranch.id,
      deletedAt: null,
    },
    create: {
      businessId: business.id,
      branchId: mainBranch.id,
      fullName: "Demo Technician",
      email: "tech@demo-repair.local",
      passwordHash: technicianPasswordHash,
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
    update: {
      fullName: "Demo Technician Two",
      role: "TECHNICIAN",
      isActive: true,
      passwordHash: technicianPasswordHash,
      branchId: mainBranch.id,
      deletedAt: null,
    },
    create: {
      businessId: business.id,
      branchId: mainBranch.id,
      fullName: "Demo Technician Two",
      email: "tech2@demo-repair.local",
      passwordHash: technicianPasswordHash,
      role: "TECHNICIAN",
    },
  });

  const customer = await prisma.customer.upsert({
    where: {
      businessId_branchId_phone: {
        businessId: business.id,
        branchId: mainBranch.id,
        phone: "+19999999999",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      branchId: mainBranch.id,
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
      branchId: mainBranch.id,
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
      businessId_branchId_sku: {
        businessId: business.id,
        branchId: mainBranch.id,
        sku: "IPH13-DISP-OLED",
      },
    },
    update: {},
    create: {
      businessId: business.id,
      branchId: mainBranch.id,
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
      branchId: mainBranch.id,
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

  const platformBusiness = await prisma.business.upsert({
    where: { slug: "repair-erp-platform" },
    update: {
      name: "Repair ERP Platform",
      status: "ACTIVE",
      description: "Internal platform tenant for SUPER_ADMIN accounts.",
    },
    create: {
      name: "Repair ERP Platform",
      slug: "repair-erp-platform",
      type: "ENTERPRISE",
      status: "ACTIVE",
      description: "Internal platform tenant for SUPER_ADMIN accounts.",
    },
  });

  await prisma.subscription.upsert({
    where: { businessId: platformBusiness.id },
    update: {
      plan: "ENTERPRISE",
      status: "ACTIVE",
      expiresAt: null,
    },
    create: {
      businessId: platformBusiness.id,
      plan: "ENTERPRISE",
      status: "ACTIVE",
      startsAt: new Date("2026-06-09T00:00:00.000Z"),
      expiresAt: null,
    },
  });

  await prisma.branch.upsert({
    where: {
      businessId_code: {
        businessId: platformBusiness.id,
        code: "PLATFORM",
      },
    },
    update: {
      name: "Platform Main",
      status: "ACTIVE",
      isMainBranch: true,
    },
    create: {
      businessId: platformBusiness.id,
      name: "Platform Main",
      code: "PLATFORM",
      status: "ACTIVE",
      isMainBranch: true,
    },
  });

  const superAdminEmails = env.SUPER_ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const superAdmins = [];
  for (const [index, email] of superAdminEmails.entries()) {
    const superAdmin = await prisma.staffMember.upsert({
      where: {
        businessId_email: {
          businessId: platformBusiness.id,
          email,
        },
      },
      update: {
        fullName: `Super Admin ${index + 1}`,
        role: "SUPER_ADMIN",
        isActive: true,
        passwordHash: superAdminPasswordHash,
        branchId: null,
      },
      create: {
        businessId: platformBusiness.id,
        branchId: null,
        fullName: `Super Admin ${index + 1}`,
        email,
        passwordHash: superAdminPasswordHash,
        role: "SUPER_ADMIN",
      },
    });
    superAdmins.push(superAdmin.id);
  }

  logger.info(
    {
      businessId: business.id,
      ownerId: owner.id,
      adminId: admin.id,
      technicianId: technician.id,
      technician2Id: technician2.id,
      platformBusinessId: platformBusiness.id,
      superAdminIds: superAdmins,
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
